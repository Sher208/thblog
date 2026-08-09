import matter from "gray-matter";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Root as MdastRoot } from "mdast";
import type { Visibility } from "./db/schema";
import { rehypePrettyCodeOptions } from "./rehype-pretty-code-options";
import { extractTocFromTree, type TocItem } from "./toc";

export type { TocItem } from "./toc";

export type ParsedMarkdown = {
  title: string;
  slug: string;
  excerpt: string;
  visibility: Visibility;
  tags: string[];
  bodyMd: string;
  publishedAt: Date | null;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toVisibility(value: unknown): Visibility {
  return value === "public" ? "public" : "private";
}

export function parseMarkdownFile(
  raw: string,
  fallbackFilename?: string,
): ParsedMarkdown {
  const { data, content } = matter(raw);
  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : "Untitled";

  const slugSource =
    typeof data.slug === "string" && data.slug.trim()
      ? data.slug
      : fallbackFilename?.replace(/\.mdx?$/i, "") || title;

  const tags = Array.isArray(data.tags)
    ? data.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : typeof data.tags === "string"
      ? data.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

  let publishedAt: Date | null = null;
  if (data.publishedAt || data.date) {
    const parsed = new Date(String(data.publishedAt ?? data.date));
    if (!Number.isNaN(parsed.getTime())) {
      publishedAt = parsed;
    }
  }

  return {
    title,
    slug: slugify(slugSource),
    excerpt:
      typeof data.excerpt === "string"
        ? data.excerpt.trim()
        : typeof data.description === "string"
          ? data.description.trim()
          : "",
    visibility: toVisibility(data.visibility),
    tags,
    bodyMd: content.trim(),
    publishedAt,
  };
}

export async function renderMarkdown(bodyMd: string): Promise<{
  html: string;
  toc: TocItem[];
}> {
  let toc: TocItem[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => (tree: MdastRoot) => {
      toc = extractTocFromTree(tree);
    })
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypePrettyCode, rehypePrettyCodeOptions)
    .use(rehypeStringify);

  const file = await processor.process(bodyMd);
  return { html: String(file), toc };
}
