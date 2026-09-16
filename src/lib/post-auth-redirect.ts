const KEY = "atlas.post_auth_redirect";

/** Only same-origin relative paths are ever stored or returned. */
function isSafePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export function setPostAuthRedirect(path: string) {
  if (typeof window === "undefined" || !isSafePath(path)) return;
  try {
    window.sessionStorage.setItem(KEY, path);
  } catch {
    // Storage unavailable — the user simply lands on the default screen.
  }
}

/** Reads and clears the stored destination. */
export function takePostAuthRedirect(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    return value && isSafePath(value) ? value : null;
  } catch {
    return null;
  }
}
