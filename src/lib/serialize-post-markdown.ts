import type { Visibility } from "./db/schema";

function yamlScalar(value: string): string {
  if (
    value === "" ||
    /[:#{}[\],&*?|>!%@`]/.test(value) ||
    /^\s|\s$/.test(value) ||
    value.includes("\n")
  ) {
    return JSON.stringify(value);
  }
  return value;
}

/** Rebuild a Markdown file with YAML frontmatter from stored post fields. */
export function serializePostToMarkdown(post: {
  title: string;
  slug: string;
  excerpt: string;
  visibility: Visibility;
  tags: string[];
  bodyMd: string;
  seriesSlug?: string | null;
  seriesTitle?: string | null;
  seriesOrder?: number | null;
}): string {
  const tagsLine =
    post.tags.length === 0
      ? "[]"
      : `[${post.tags.map((tag) => yamlScalar(tag)).join(", ")}]`;

  const frontmatter = [
    "---",
    `title: ${yamlScalar(post.title)}`,
    `slug: ${yamlScalar(post.slug)}`,
    `tags: ${tagsLine}`,
    `excerpt: ${yamlScalar(post.excerpt)}`,
    `visibility: ${post.visibility}`,
  ];

  if (post.seriesSlug) {
    frontmatter.push(`series: ${yamlScalar(post.seriesSlug)}`);
    if (post.seriesTitle) {
      frontmatter.push(`seriesTitle: ${yamlScalar(post.seriesTitle)}`);
    }
    if (post.seriesOrder != null) {
      frontmatter.push(`seriesOrder: ${post.seriesOrder}`);
    }
  }

  frontmatter.push("---");

  const body = post.bodyMd.trim();
  return body
    ? `${frontmatter.join("\n")}\n\n${body}\n`
    : `${frontmatter.join("\n")}\n`;
}
