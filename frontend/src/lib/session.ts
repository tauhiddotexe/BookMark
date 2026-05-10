export type Tokens = {
  access: string;
  refresh?: string;
};

const TOKENS_KEY = "bookmark_tokens";
const USER_KEY = "bookmark_user";

export function getStoredTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return getStoredTokens()?.access || "";
}

export function saveSession(tokens: Tokens, username: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  window.localStorage.setItem(USER_KEY, username);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKENS_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getStoredUsername() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(USER_KEY) || "";
}
