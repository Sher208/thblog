const WORDS_PER_MINUTE = 200;

/** Rough reading-time estimate from Markdown body (code counts as words). */
export function estimateReadingMinutes(bodyMd: string): number {
  const words = bodyMd
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number): string {
  return minutes === 1 ? "1 min read" : `${minutes} min read`;
}
