import { BookDetail, BookList, BookState, FeedResponse, ProfileDetail, SearchBookResult, User } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  revalidate?: number;
  authToken?: string;
};

function formatApiError(payload: unknown, status: number) {
  if (!payload || typeof payload !== "object") return `API request failed: ${status}`;

  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;

  if (Array.isArray(record.non_field_errors) && typeof record.non_field_errors[0] === "string") {
    return record.non_field_errors[0];
  }

  const fieldErrors = Object.entries(record)
    .filter(([key]) => key !== "detail" && key !== "non_field_errors")
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${String(value[0])}`;
      if (typeof value === "string") return `${key}: ${value}`;
      return "";
    })
    .filter(Boolean);

  return fieldErrors[0] || `API request failed: ${status}`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { revalidate, authToken, headers, body, ...init } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: revalidate === 0 ? "no-store" : undefined,
    next: revalidate !== undefined ? { revalidate } : undefined,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(headers || {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = formatApiError(payload, response.status);
    throw new Error(detail);
  }
  return payload as T;
}

export const getFeed = (page = 1, authToken?: string) =>
  request<FeedResponse>(`/feed/?page=${page}`, { revalidate: 0, authToken });

export const getStats = () =>
  request<{ users: number; books: number; reviews: number; lists: number }>("/stats/", { revalidate: 300 });

export const getBook = (slug: string) =>
  request<BookDetail>(`/books/${slug}/`, { revalidate: 0 });

export const getProfile = (username: string) =>
  request<ProfileDetail>(`/profiles/${username}/`, { revalidate: 0 });

export const searchBooks = (query: string) =>
  request<{ results: SearchBookResult[] }>(`/books/search/?q=${encodeURIComponent(query)}`, { revalidate: 600 });

export const discoverBooks = () =>
  request<{ results: SearchBookResult[] }>("/books/discover/", { revalidate: 600 });

export const getLists = (username?: string) =>
  request<{ count: number; results: BookList[] }>(`/lists/${username ? `?username=${encodeURIComponent(username)}` : ""}`, { revalidate: 120 });

export const getBookState = (slug: string, token: string) =>
  request<BookState>(`/books/${slug}/my_state/`, { authToken: token, revalidate: 0 });

export const setBookShelf = (slug: string, token: string, shelf: string) =>
  request<BookState>(`/books/${slug}/set_shelf/`, {
    method: "POST",
    authToken: token,
    revalidate: 0,
    body: { shelf }
  });

export const importGoogleBook = async (volumeId: string, token: string) => {
  if (typeof window !== "undefined") {
    console.debug("[Bookmark] Import request", {
      endpoint: `${API_BASE}/books/import_google/`,
      method: "POST",
      hasAuthHeader: Boolean(token),
      volumeId,
    });
  }

  const payload = await request<{ id: number; slug: string; title: string }>(`/books/import_google/`, {
    method: "POST",
    authToken: token,
    revalidate: 0,
    body: { volume_id: volumeId }
  });

  if (typeof window !== "undefined") {
    console.debug("[Bookmark] Import response", payload);
  }
  return payload;
};

export const createReview = (
  token: string,
  payload: { user_id?: number; book_id: number; rating: number; review_text: FormDataEntryValue | null; text?: FormDataEntryValue | null; contains_spoilers: boolean }
) =>
  request<{ id: number }>("/reviews/", {
    method: "POST",
    authToken: token,
    revalidate: 0,
    body: payload
  });

export const toggleReviewLike = (reviewId: number, token: string, liked: boolean) =>
  request<{ likes_count: number }>(`/reviews/${reviewId}/${liked ? "unlike" : "like"}/`, {
    method: "POST",
    authToken: token,
    revalidate: 0
  });

export const loginUser = (username: string, password: string) =>
  request<{ access: string; refresh: string }>("/auth/login/", {
    method: "POST",
    revalidate: 0,
    body: { username, password }
  });

export const signupUser = (payload: Record<string, FormDataEntryValue | null>) =>
  request("/auth/signup/", {
    method: "POST",
    revalidate: 0,
    body: payload
  });

export const getCurrentUser = (token: string) =>
  request<User>("/auth/me/", { authToken: token, revalidate: 0 });
