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
    "---",
  ].join("\n");

  const body = post.bodyMd.trim();
  return body ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
}
