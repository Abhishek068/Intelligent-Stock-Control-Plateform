

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined in environment variables.");
}




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
    const message =
    typeof body === "object" && body !== null ?
    body.error ?? JSON.stringify(body) :
    String(body);
    throw new ApiError(response.status, message);
  }

  return body;
}

export class ApiError extends Error {



  constructor(status, details) {
    const message =
    typeof details === "string" ?
    details :
    typeof details === "object" && details !== null && "detail" in details ?
    String(details.detail) :
    "Request failed";
    super(message);
    this.status = status;
    this.details = details;
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
  post(path, body) {
    return request(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  },
  patch(path, body) {
    return request(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined
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