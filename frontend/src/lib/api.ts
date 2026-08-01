import {
  Book, BookList, BookListDetail, BookListItem, SearchBookResult, User, Profile,
  DiaryEntry, DiaryResponse, Review, ReadlistEntry, FavoriteBook,
  MeDetail, UserStats,
} from "@/lib/types";
import { auth } from "@/lib/firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// ---------------------------------------------------------------------------
// Gating for startup hydration & auth transitions
// ---------------------------------------------------------------------------
let isAuthHydrated = false;
let resolveAuthReady: () => void;
let authReadyPromise = new Promise<void>((resolve) => {
  resolveAuthReady = resolve;
});

export const setAuthHydrated = (val: boolean) => {
  if (val) {
    if (!isAuthHydrated) {
      isAuthHydrated = true;
      resolveAuthReady();
    }
  } else {
    if (isAuthHydrated) {
      isAuthHydrated = false;
      authReadyPromise = new Promise<void>((resolve) => {
        resolveAuthReady = resolve;
      });
    }
  }
};

const waitForAuthHydration = async () => {
  if (isAuthHydrated) return;
  await authReadyPromise;
};

// ---------------------------------------------------------------------------
// Token retrieval — simple, single-flight
// ---------------------------------------------------------------------------
let activeTokenPromise: Promise<string | null> | null = null;

export const getAccessToken = async (forceRefresh = false): Promise<string | null> => {
  await auth.authStateReady();
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  if (activeTokenPromise && !forceRefresh) {
    return activeTokenPromise;
  }

  activeTokenPromise = (async () => {
    try {
      return await currentUser.getIdToken(forceRefresh);
    } catch (e) {
      console.error("[Auth] Token retrieval failed:", e);
      return null;
    } finally {
      activeTokenPromise = null;
    }
  })();

  return activeTokenPromise;
};

// ---------------------------------------------------------------------------
// Auth state flags
// ---------------------------------------------------------------------------
let isAuthTransitioning = false;
let isSyncingUser = false;

export const setAuthTransitioning = (val: boolean) => {
  isAuthTransitioning = val;
};

export const setSyncingUser = (val: boolean) => {
  isSyncingUser = val;
};

const activeControllers = new Set<AbortController>();

export const abortAllRequests = () => {
  for (const controller of activeControllers) {
    controller.abort();
  }
  activeControllers.clear();
};

export const clearApiCache = () => {
  requestCache.clear();
  inFlightRequests.clear();
};

// ---------------------------------------------------------------------------
// API cache & deduplication
// ---------------------------------------------------------------------------
const inFlightRequests = new Map<string, Promise<any>>();
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5;

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

function buildHeaders(
  body: unknown, token: string | null, extraHeaders: HeadersInit | undefined
): HeadersInit {
  return {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders || {}),
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(formatApiError(payload, response.status));
  return payload as T;
}

async function executeRequest<T>(
  path: string, init: RequestInit, body: unknown, headers: HeadersInit | undefined,
  signal: AbortSignal, authToken: string | undefined, _isRetry: boolean
): Promise<T> {
  const token = authToken || (await getAccessToken());
  const serializedBody = body !== undefined ? JSON.stringify(body) : undefined;

  const response = await fetch(`${API_BASE}${path}`, {
    ...init, signal, headers: buildHeaders(body, token, headers), body: serializedBody,
  });

  if (response.status === 401 && auth.currentUser && !_isRetry) {
    console.warn(`[API] 401 on ${path}. Refreshing token once...`);
    let newToken: string | null = null;
    try {
      newToken = await getAccessToken(true);
    } catch { /* ignore */ }
    if (newToken) {
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...init, signal, headers: buildHeaders(body, newToken, headers), body: serializedBody,
      });
      return parseJsonResponse<T>(retryResponse);
    }
  }

  if (response.status === 403) {
    console.warn(`[API] 403 on ${path}. Permission denied.`);
  }

  return parseJsonResponse<T>(response);
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown; authToken?: string; dedupeKey?: string; skipCache?: boolean; _isRetry?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authToken, dedupeKey, skipCache, headers, body, signal, _isRetry, ...init } = options;
  const isAuthRequest = path === "/auth/me/";

  if (!isAuthRequest) {
    await waitForAuthHydration();
  }

  if ((isAuthTransitioning || isSyncingUser) && !isAuthRequest) {
    const abortErr = new Error("Request cancelled: auth transition in progress");
    abortErr.name = "AbortError";
    throw abortErr;
  }

  const requestController = new AbortController();
  if (!_isRetry && !isAuthRequest) {
    activeControllers.add(requestController);
  }

  if (signal) {
    signal.addEventListener("abort", () => requestController.abort());
    if (signal.aborted) requestController.abort();
  }

  const method = init.method || "GET";
  const useDedupe = method === "GET" || dedupeKey;
  const key = dedupeKey || `${method}:${path}`;

  if (useDedupe && !skipCache) {
    const cached = requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      activeControllers.delete(requestController);
      return cached.data as T;
    }
    if (inFlightRequests.has(key)) {
      activeControllers.delete(requestController);
      return inFlightRequests.get(key) as Promise<T>;
    }
  }

  const promise = (async () => {
    try {
      return await executeRequest<T>(path, init, body, headers, requestController.signal, authToken, _isRetry ?? false);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.debug(`[API] Request aborted: ${path}`);
      }
      throw err;
    } finally {
      activeControllers.delete(requestController);
    }
  })();

  if (useDedupe && !skipCache) {
    inFlightRequests.set(key, promise);
    promise
      .then((data) => { requestCache.set(key, { data, timestamp: Date.now() }); })
      .catch(() => { /* Don't cache rejected promises */ })
      .finally(() => { setTimeout(() => inFlightRequests.delete(key), 50); });
  }

  return promise;
}

// ---------------------------------------------------------------------------
// API functions — BookMark Personal Journal
// ---------------------------------------------------------------------------

// Home
export const getHomeFeatured = (options: RequestOptions = {}) =>
  request<SearchBookResult[]>("/home/featured/", options);

// Auth
export const syncUser = (authToken?: string, options: RequestOptions = {}) =>
  request<User>("/auth/me/", { authToken, ...options });

export const getMyProfile = (options: RequestOptions = {}) =>
  request<MeDetail>("/me/", options);

export const updateMyProfile = (token: string, payload: {
  username?: string; profile?: Partial<Profile>;
}) =>
  request<User>("/auth/me/", { method: "PATCH", authToken: token, body: payload });

export const getMyStats = (options: RequestOptions = {}) =>
  request<UserStats>("/stats/", options);

// Books
export const searchBooks = (query: string, category?: string, isbn?: string, options: RequestOptions = {}) => {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (isbn) params.set("isbn", isbn);
  return request<{ results: SearchBookResult[] }>(`/books/search/?${params.toString()}`, options);
};

export const discoverBooks = (options: RequestOptions = {}) =>
  request<{ results: SearchBookResult[] }>("/books/discover/", options);

export const getNewReleases = (options: RequestOptions = {}) =>
  request<{ results: SearchBookResult[] }>("/books/new_releases/", options);

export const getBook = (slug: string, options: RequestOptions = {}) =>
  request<Book>(`/books/${slug}/`, options);

export const importGoogleBook = async (volumeId: string, token: string) => {
  const payload = await request<{ id: number; slug: string; title: string }>("/books/import_google/", {
    method: "POST", authToken: token, body: { volume_id: volumeId },
  });
  return payload;
};

// Reviews
export const createReview = async (token: string, payload: {
  book_id: string; rating: number; review_text?: string;
}) => {
  const res = await request<Review>("/reviews/", { method: "POST", authToken: token, body: payload });
  clearApiCache();
  return res;
};

export const updateReview = async (id: string, token: string, payload: {
  rating: number; review_text?: string;
}) => {
  const res = await request<Review>(`/reviews/${id}/`, { method: "PATCH", authToken: token, body: payload });
  clearApiCache();
  return res;
};

export const deleteReview = async (id: string, token: string) => {
  await request(`/reviews/${id}/`, { method: "DELETE", authToken: token });
  clearApiCache();
};

export const getReviews = (bookSlug?: string, options: RequestOptions = {}) => {
  const params = bookSlug ? `?book=${encodeURIComponent(bookSlug)}` : "";
  return request<{ count: number; results: Review[] }>(`/reviews/${params}`, options);
};

// Diary
export const getDiaryEntries = (params: Record<string, string | number | boolean>, options: RequestOptions = {}) => {
  const query = new URLSearchParams(params as any).toString();
  return request<DiaryResponse>(`/diary/?${query}`, options);
};

export const createDiaryEntry = async (token: string, payload: {
  book_id: string; read_date: string; rating?: number; review_text?: string; tags?: string[];
}) => {
  const res = await request<DiaryEntry>("/diary/", { method: "POST", authToken: token, body: payload });
  clearApiCache();
  return res;
};

export const updateDiaryEntry = async (id: string, token: string, payload: {
  read_date: string; rating?: number | null; review_text?: string;
  is_reread: boolean; tags?: string[];
}) => {
  const res = await request(`/diary/${id}/`, { method: "PATCH", authToken: token, body: payload });
  clearApiCache();
  return res;
};

export const deleteDiaryEntry = async (id: string, token: string) => {
  await request(`/diary/${id}/`, { method: "DELETE", authToken: token });
  clearApiCache();
};

// Readlist
export const getReadlist = (options: RequestOptions = {}) =>
  request<{ count: number; results: ReadlistEntry[] }>("/readlist/", options);

export const getCurrentlyReading = () =>
  request<{ count: number; results: ReadlistEntry[] }>("/readlist/?status=currently_reading");

export const addToReadlist = async (bookId: string, token: string, status?: string) => {
  const body: Record<string, unknown> = { book_id: bookId };
  if (status) body.status = status;
  const res = await request<ReadlistEntry>("/readlist/", {
    method: "POST", authToken: token, body,
  });
  clearApiCache();
  return res;
};

export const updateReadlistEntry = async (id: string, token: string, payload: {
  status?: string; current_page?: number;
}) => {
  const res = await request<ReadlistEntry>(`/readlist/${id}/`, {
    method: "PATCH", authToken: token, body: payload,
  });
  clearApiCache();
  return res;
};

export const removeFromReadlist = async (id: string, token: string) => {
  await request(`/readlist/${id}/`, { method: "DELETE", authToken: token });
  clearApiCache();
};

// Favorites
export const getFavorites = (options: RequestOptions = {}) =>
  request<{ count: number; results: FavoriteBook[] }>("/favorites/", options);

export const addFavorite = async (bookId: string, token: string) => {
  const res = await request<FavoriteBook>("/favorites/", {
    method: "POST", authToken: token, body: { book_id: bookId },
  });
  clearApiCache();
  return res;
};

export const removeFavorite = async (id: string, token: string) => {
  await request(`/favorites/${id}/`, { method: "DELETE", authToken: token });
  clearApiCache();
};

// Lists
export const getLists = (options: RequestOptions = {}) =>
  request<{ count: number; results: BookList[] }>("/lists/", options);

export const getList = (id: string, options: RequestOptions = {}) =>
  request<BookListDetail>(`/lists/${id}/`, options);

export const createList = async (token: string, payload: { name: string; description?: string; is_ranked?: boolean }) => {
  const res = await request<BookList>("/lists/", { method: "POST", authToken: token, body: payload });
  clearApiCache();
  return res;
};

export const updateList = async (id: string, token: string, payload: { name?: string; description?: string; is_ranked?: boolean }) => {
  const res = await request<BookList>(`/lists/${id}/`, { method: "PATCH", authToken: token, body: payload });
  clearApiCache();
  return res;
};

export const deleteList = async (id: string, token: string) => {
  await request(`/lists/${id}/`, { method: "DELETE", authToken: token });
  clearApiCache();
};

export const addBookToList = async (listId: string, token: string, bookId: string, notes?: string) => {
  const res = await request<BookListItem>(`/lists/${listId}/add_book/`, {
    method: "POST", authToken: token, body: { book_id: bookId, notes: notes || "" },
  });
  clearApiCache();
  return res;
};

export const removeBookFromList = async (listId: string, token: string, itemId: string) => {
  await request(`/lists/${listId}/remove_book/`, {
    method: "POST", authToken: token, body: { item_id: itemId },
  });
  clearApiCache();
};

export const reorderList = async (listId: string, token: string, order: string[]) => {
  await request(`/lists/${listId}/reorder/`, {
    method: "POST", authToken: token, body: { order },
  });
  clearApiCache();
};
