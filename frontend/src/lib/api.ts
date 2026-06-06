import { ActivityResponse, BookDetail, BookList, BookState, FeedResponse, ProfileDetail, SearchBookResult, User } from "@/lib/types";
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
      console.info("[Auth] Hydration complete. Releasing gated requests.");
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

  // Single-flight: reuse in-progress token call
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

// ---------------------------------------------------------------------------
// API cache & deduplication
// ---------------------------------------------------------------------------
const inFlightRequests = new Map<string, Promise<any>>();
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5;

export const clearApiCache = () => {
  requestCache.clear();
  inFlightRequests.clear();
};

// ---------------------------------------------------------------------------
// Abort tracking (for auth transitions only)
// ---------------------------------------------------------------------------
const activeControllers = new Set<AbortController>();

export const abortAllRequests = () => {
  for (const controller of activeControllers) {
    controller.abort();
  }
  activeControllers.clear();
};

// ---------------------------------------------------------------------------
// Error formatting
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Fetch helpers — extracted to reduce cognitive complexity of `request`
// ---------------------------------------------------------------------------
function buildHeaders(
  body: unknown,
  token: string | null,
  extraHeaders: HeadersInit | undefined
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
  path: string,
  init: RequestInit,
  body: unknown,
  headers: HeadersInit | undefined,
  signal: AbortSignal,
  authToken: string | undefined,
  _isRetry: boolean
): Promise<T> {
  const token = authToken || (await getAccessToken());
  const serializedBody = body !== undefined ? JSON.stringify(body) : undefined;

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal,
    headers: buildHeaders(body, token, headers),
    body: serializedBody,
  });

  // 401: try one token refresh, never sign-out
  if (response.status === 401 && auth.currentUser && !_isRetry) {
    console.warn(`[API] 401 on ${path}. Refreshing token once...`);
    let newToken: string | null = null;
    try {
      newToken = await getAccessToken(true);
    } catch {
      console.error(`[API] Token refresh failed for ${path}`);
    }
    if (newToken) {
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...init,
        signal,
        headers: buildHeaders(body, newToken, headers),
        body: serializedBody,
      });
      return parseJsonResponse<T>(retryResponse);
    }
    // Token refresh returned null — fall through and parse the original 401
  }

  // 403: permission error — never an auth failure
  if (response.status === 403) {
    console.warn(`[API] 403 on ${path}. Permission denied — NOT an auth failure.`);
  }

  return parseJsonResponse<T>(response);
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------
type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  authToken?: string;
  dedupeKey?: string;
  skipCache?: boolean;
  _isRetry?: boolean;
};

// ---------------------------------------------------------------------------
// Core request function — simplified, no retry storms
// ---------------------------------------------------------------------------
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authToken, dedupeKey, skipCache, headers, body, signal, _isRetry, ...init } = options;

  const isAuthRequest = path === "/auth/me/";

  // Gate protected requests until Firebase auth hydration is completed
  if (!isAuthRequest) {
    await waitForAuthHydration();
  }

  // Block requests during auth transitions (except /auth/me/ itself)
  if ((isAuthTransitioning || isSyncingUser) && !isAuthRequest) {
    const abortErr = new Error("Request cancelled: auth transition in progress");
    abortErr.name = "AbortError";
    throw abortErr;
  }

  // Set up abort controller
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

  // Check cache/dedup for GET requests
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
      return await executeRequest<T>(
        path, init, body, headers, requestController.signal, authToken, _isRetry ?? false
      );
    } catch (err: any) {
      // Gracefully handle AbortErrors — don't let them surface as uncaught
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
      .then((data) => {
        requestCache.set(key, { data, timestamp: Date.now() });
      })
      .catch(() => {
        // Don't cache rejected promises
      })
      .finally(() => {
        setTimeout(() => inFlightRequests.delete(key), 50);
      });
  }

  return promise;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------
export const getFeed = (page = 1, authToken?: string, options: RequestOptions = {}) =>
  request<FeedResponse>(`/feed/?page=${page}`, { authToken, ...options });

export const getStats = (options: RequestOptions = {}) =>
  request<{ users: number; books: number; reviews: number; lists: number }>("/stats/", options);

export const getBook = (slug: string, options: RequestOptions = {}) =>
  request<BookDetail>(`/books/${slug}/`, options);

export const getProfile = (username: string, token?: string, options: RequestOptions = {}) =>
  request<ProfileDetail>(`/profiles/${username}/`, { authToken: token, ...options });

export const followUser = async (username: string, token: string) => {
  const res = await request(`/profiles/${username}/follow/`, { method: "POST", authToken: token });
  clearApiCache();
  return res;
};

export const unfollowUser = async (username: string, token: string) => {
  const res = await request(`/profiles/${username}/unfollow/`, { method: "POST", authToken: token });
  clearApiCache();
  return res;
};

export const searchBooks = (query: string, options: RequestOptions = {}) =>
  request<{ results: SearchBookResult[] }>(`/books/search/?q=${encodeURIComponent(query)}`, options);

export const discoverBooks = (options: RequestOptions = {}) =>
  request<{ results: SearchBookResult[] }>("/books/discover/", options);

export const getLists = (username?: string, options: RequestOptions = {}) =>
  request<{ count: number; results: BookList[] }>(`/lists/${username ? `?username=${encodeURIComponent(username)}` : ""}`, options);

export const getBookState = (slug: string, token: string, options: RequestOptions = {}) =>
  request<BookState>(`/books/${slug}/my_state/`, { authToken: token, ...options });

export const setBookShelf = async (slug: string, token: string, shelf: string) => {
  const res = await request<BookState>(`/books/${slug}/set_shelf/`, {
    method: "POST",
    authToken: token,
    body: { shelf },
  });
  clearApiCache();
  return res;
};

export const importGoogleBook = async (volumeId: string, token: string) => {
  const payload = await request<{ id: number; slug: string; title: string }>(`/books/import_google/`, {
    method: "POST",
    authToken: token,
    body: { volume_id: volumeId },
  });
  return payload;
};

export const createReview = async (
  token: string,
  payload: { user_id?: number; book_id: number; rating: number; review_text: FormDataEntryValue | null; text?: FormDataEntryValue | null; contains_spoilers: boolean }
) => {
  const res = await request<{ id: number }>("/reviews/", {
    method: "POST",
    authToken: token,
    body: payload,
  });
  clearApiCache();
  return res;
};

export const logDiaryEntry = async (
  token: string,
  payload: {
    book_id: number;
    read_date: string;
    rating?: number;
    review_text?: string;
    is_reread: boolean;
    contains_spoilers: boolean;
  }
) => {
  const res = await request("/diary/", {
    method: "POST",
    authToken: token,
    body: payload,
  });
  clearApiCache();
  return res;
};

export const toggleReviewLike = async (reviewId: number, token: string, liked: boolean) => {
  const res = await request<{ likes_count: number }>(`/reviews/${reviewId}/${liked ? "unlike" : "like"}/`, {
    method: "POST",
    authToken: token,
  });
  clearApiCache();
  return res;
};

export const syncUser = (authToken?: string, options: RequestOptions = {}) =>
  request<User>("/auth/me/", { authToken, ...options });


export function getActivities(feed: "global" | "following" = "global", page = 1, options: RequestOptions = {}) {
  return request<ActivityResponse>(`/activities/?feed=${feed}&page=${page}`, options);
}
