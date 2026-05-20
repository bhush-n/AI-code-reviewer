const BASE = import.meta.env.VITE_API_URL ?? "";

export interface ReviewSummary {
  id: number;
  title: string;
  language: string;
  created_at: string;
}

export interface Review extends ReviewSummary {
  code: string;
  response: string;
}

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${input}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listReviews: () => jsonFetch<ReviewSummary[]>("/api/reviews"),
  getReview: (id: number) => jsonFetch<Review>(`/api/reviews/${id}`),
  createReview: (payload: { code: string; language: string }) =>
    jsonFetch<Review>("/api/reviews", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteReview: (id: number) =>
    jsonFetch<void>(`/api/reviews/${id}`, { method: "DELETE" }),
};
