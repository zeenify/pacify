export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_URL + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    cache: "no-store", // auth state must NEVER come from browser cache
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? "REQUEST FAILED");
  return data as T;
}
