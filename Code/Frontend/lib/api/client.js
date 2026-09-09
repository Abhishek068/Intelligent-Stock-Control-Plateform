

const API_URL =
  process.env.NEXT_PUBLIC_API_URL &&
  process.env.NEXT_PUBLIC_API_URL.startsWith("http") &&
  !process.env.NEXT_PUBLIC_API_URL.includes("localhost")
    ? process.env.NEXT_PUBLIC_API_URL
    : "https://intelligent-stock-control-plateform.onrender.com/api/v1";





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
    if (typeof body === "object" && body !== null) {
      if (body.error && typeof body.error === "string") {
        message = body.error;
      } else if (body.detail && typeof body.detail === "string") {
        message = body.detail;
      } else if (body.message && typeof body.message === "string") {
        message = body.message;
      } else if (Array.isArray(body.non_field_errors) && body.non_field_errors.length > 0) {
        message = String(body.non_field_errors[0]);
      } else if (Array.isArray(body) && body.length > 0) {
        message = typeof body[0] === "string" ? body[0] : JSON.stringify(body[0]);
      } else {
        const firstKey = Object.keys(body)[0];
        if (firstKey) {
          const val = body[firstKey];
          if (Array.isArray(val) && val.length > 0) {
            message = typeof val[0] === "string" ? val[0] : `${firstKey}: ${JSON.stringify(val[0])}`;
          } else if (typeof val === "string") {
            message = val;
          } else {
            message = `${firstKey}: ${JSON.stringify(val)}`;
          }
        } else {
          message = JSON.stringify(body);
        }
      }
    } else if (typeof body === "string") {
      message = body;
    }
    throw new ApiError(response.status, message, body);
  }

  return body;
}

export class ApiError extends Error {
  constructor(status, message, rawDetails = null) {
    super(typeof message === "string" ? message : "Request failed");
    this.status = status;
    this.details = rawDetails || message;
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

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new ApiError(0, "Request cancelled");
    }
    throw new ApiError(0, err?.message || "Network error: Unable to connect to server");
  }

  const isAuthPath = path === "/auth/login/" || path === "/auth/token/refresh/";
  if (response.status === 401 && retry && !isAuthPath) {
    let newToken = null;
    try {
      newToken = await refreshAccessToken();
    } catch {
      newToken = null;
    }
    if (newToken) {
      return request(path, options, false);
    }
    onUnauthorized();
    throw new ApiError(401, "Session expired");
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
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) return payload.data;
    if ("results" in payload && Array.isArray(payload.results)) return payload.results;
    if (
      payload.data &&
      typeof payload.data === "object" &&
      "results" in payload.data &&
      Array.isArray(payload.data.results)
    ) {
      return payload.data.results;
    }
  }
  return [];
}