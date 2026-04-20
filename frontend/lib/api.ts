const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, { ...init, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

export async function fetchJsonl<T = any>(url: string): Promise<T[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
  const text = await r.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

export function apiUrl(path: string) {
  return `${API}${path}`;
}
