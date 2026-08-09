import GithubSlugger from "github-slugger";

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

/**
 * Lightweight heading outline for the editor (skips fenced code).
 * Slugs match github-slugger / rehype-slug for plain heading text.
 */
export function extractTocFromMarkdown(bodyMd: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let inFence = false;

  for (const line of bodyMd.split("\n")) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const text = (match[2] ?? "").trim();
    if (!text) continue;

    items.push({
      id: slugger.slug(text),
      text,
      level: match[1]?.length ?? 2,
    });
  }

  return items;
}
