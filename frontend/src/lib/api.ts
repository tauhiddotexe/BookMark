import { BookDetail, BookList, BookState, FeedResponse, ProfileDetail, SearchBookResult, User } from "@/lib/types";

const API_BASE = "/api";

export const getAccessToken = () => localStorage.getItem("token");

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
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
  const { authToken, headers, body, ...init } = options;
  const token = authToken || getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  request<FeedResponse>(`/feed/?page=${page}`, { authToken });

export const getStats = () =>
  request<{ users: number; books: number; reviews: number; lists: number }>("/stats/");

export const getBook = (slug: string) =>
  request<BookDetail>(`/books/${slug}/`);

export const getProfile = (username: string, token?: string) =>
  request<ProfileDetail>(`/profiles/${username}/`, { authToken: token });

export const followUser = (username: string, token: string) =>
  request(`/profiles/${username}/follow/`, { method: "POST", authToken: token });

export const unfollowUser = (username: string, token: string) =>
  request(`/profiles/${username}/unfollow/`, { method: "POST", authToken: token });

export const searchBooks = (query: string) =>
  request<{ results: SearchBookResult[] }>(`/books/search/?q=${encodeURIComponent(query)}`);

export const discoverBooks = () =>
  request<{ results: SearchBookResult[] }>("/books/discover/");

export const getLists = (username?: string) =>
  request<{ count: number; results: BookList[] }>(`/lists/${username ? `?username=${encodeURIComponent(username)}` : ""}`);

export const getBookState = (slug: string, token: string) =>
  request<BookState>(`/books/${slug}/my_state/`, { authToken: token });

export const setBookShelf = (slug: string, token: string, shelf: string) =>
  request<BookState>(`/books/${slug}/set_shelf/`, {
    method: "POST",
    authToken: token,
    body: { shelf }
  });

export const importGoogleBook = async (volumeId: string, token: string) => {
  console.debug("[Bookmark] Import request", {
    endpoint: `${API_BASE}/books/import_google/`,
    method: "POST",
    hasAuthHeader: Boolean(token),
    volumeId,
  });

  const payload = await request<{ id: number; slug: string; title: string }>(`/books/import_google/`, {
    method: "POST",
    authToken: token,
    body: { volume_id: volumeId }
  });

  console.debug("[Bookmark] Import response", payload);
  return payload;
};

export const createReview = (
  token: string,
  payload: { user_id?: number; book_id: number; rating: number; review_text: FormDataEntryValue | null; text?: FormDataEntryValue | null; contains_spoilers: boolean }
) =>
  request<{ id: number }>("/reviews/", {
    method: "POST",
    authToken: token,
    body: payload
  });

export const logDiaryEntry = (
  token: string,
  payload: { 
    book_id: number; 
    read_date: string; 
    rating?: number; 
    review_text?: string; 
    is_reread: boolean; 
    contains_spoilers: boolean 
  }
) =>
  request("/diary/", {
    method: "POST",
    authToken: token,
    body: payload
  });

export const toggleReviewLike = (reviewId: number, token: string, liked: boolean) =>
  request<{ likes_count: number }>(`/reviews/${reviewId}/${liked ? "unlike" : "like"}/`, {
    method: "POST",
    authToken: token
  });

export const syncUser = () =>
  request<User>("/auth/me/");

export const getCurrentUser = (token: string) =>
  request<User>("/auth/me/", { authToken: token });

export async function getActivities(feed: "global" | "following" = "global", page = 1): Promise<ActivityResponse> {
  const access = getAccessToken();
  const headers: Record<string, string> = {};
  if (access) headers["Authorization"] = `Bearer ${access}`;
  
  const res = await fetch(`${API_BASE}/activities/?feed=${feed}&page=${page}`, { headers });
  if (!res.ok) throw new Error("Could not fetch activities.");
  return res.json();
}
