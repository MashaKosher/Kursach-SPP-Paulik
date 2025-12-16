import { API_BASE_URL } from "../config";

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(typeof (data as any)?.message === "string" ? (data as any).message : "API Error");
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;
  if (!res.ok) {
    // If token expired/invalid -> trigger global logout+redirect handler.
    if (res.status === 401) {
      try {
        window.dispatchEvent(
          new CustomEvent("auth:unauthorized", {
            detail: { next: window.location.pathname + window.location.search + window.location.hash }
          })
        );
      } catch {
        // ignore
      }
    }
    throw new ApiError(res.status, data);
  }
  return data as T;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}


