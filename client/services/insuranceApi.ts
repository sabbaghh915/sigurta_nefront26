const API_BASE =
  (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3000/api");

async function apiFetch<T>(path: string, payload: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || "Bad Request");
  }
  return json as T;
}

export async function calculateMandatoryInsurance(payload: any) {
  const r = await apiFetch<{ success: true; data: any }>("/insurance/calculate", payload);
  return r.data;
}
