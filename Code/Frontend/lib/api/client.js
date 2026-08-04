

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";




let getAccessToken = () => null;
let refreshAccessToken = async () => null;
let onUnauthorized = () => {};

export function configureApiClient(options)



{
  getAccessToken = options.getAccessToken;
  refreshAccessToken = options.refreshAccessToken;
  onUnauthorized = options.onUnauthorized;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let message = "Request failed";
    if (typeof body === "string") {
      message = body;
    } else if (typeof body === "object" && body !== null) {
      if (body.error) {
        message = String(body.error);
      } else if (body.detail) {
        message = String(body.detail);
      } else if (Array.isArray(body.non_field_errors)) {
        message = body.non_field_errors.join(", ");
      } else {
        const entries = Object.entries(body);
        if (entries.length > 0) {
          const [key, val] = entries[0];
          const valStr = Array.isArray(val) ? val.join(", ") : String(val);
          message = key === "non_field_errors" ? valStr : `${key}: ${valStr}`;
        } else {
          message = JSON.stringify(body);
        }
      }
    }
    throw new ApiError(response.status, message, body);
  }

  return body;
}

export class ApiError extends Error {
  constructor(status, details, rawBody) {
    const message = typeof details === "string" ? details : "Request failed";
    super(message);
    this.status = status;
    this.details = details;
    this.rawBody = rawBody;
  }
}

async function request(
path,
options = {},
retry = true)
{
  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request(path, options, false);
    }
    onUnauthorized();
  }

  return parseResponse(response);
}

export const apiClient = {
  get(path) {
    return request(path, { method: "GET" });
  },
  post(path, body, options = {}) {
    return request(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
    });
  },
  put(path, body, options = {}) {
    return request(path, {
      ...options,
      method: "PUT",
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
    });
  },
  patch(path, body, options = {}) {
    return request(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
    });
  },
  delete(path) {
    return request(path, { method: "DELETE" });
  }
};

export function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "results" in payload) {
    return payload.results;
  }
  return [];
}