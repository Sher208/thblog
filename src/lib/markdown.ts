import GithubSlugger from "github-slugger";
import matter from "gray-matter";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Root as MdastRoot } from "mdast";
import type { Visibility } from "./db/schema";

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

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

function extractToc(tree: MdastRoot): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];

  visit(tree, "heading", (node) => {
    if (node.depth < 1 || node.depth > 3) return;
    const text = node.children
      .map((child) => {
        if ("value" in child && typeof child.value === "string") {
          return child.value;
        }
        return "";
      })
      .join("")
      .trim();
    if (!text) return;
    items.push({
      id: slugger.slug(text),
      text,
      level: node.depth,
    });
  });

  return items;
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
      toc = extractToc(tree);
    })
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypePrettyCode, {
      theme: {
        light: "github-light",
        dark: "github-dark",
      },
      keepBackground: false,
      defaultLang: "txt",
    })
    .use(rehypeStringify);

  const file = await processor.process(bodyMd);
  return { html: String(file), toc };
}
