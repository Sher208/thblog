const STORAGE_PREFIX = "thblog-section-bookmark:";

function storageKey(postKey: string) {
  return `${STORAGE_PREFIX}${postKey}`;
}

/** Heading id bookmarked for a post, or null if none / unavailable. */
export function getSectionBookmark(postKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(storageKey(postKey));
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function setSectionBookmark(postKey: string, headingId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(postKey), headingId);
  } catch {
    // ignore quota / private mode
  }
}

export function clearSectionBookmark(postKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(postKey));
  } catch {
    // ignore
  }
}
