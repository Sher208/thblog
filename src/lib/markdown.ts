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
  seriesSlug: string | null;
  seriesTitle: string | null;
  seriesOrder: number | null;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toVisibility(value: unknown): Visibility {
  return value === "public" ? "public" : "private";
}

function parseSeries(data: Record<string, unknown>): {
  seriesSlug: string | null;
  seriesTitle: string | null;
  seriesOrder: number | null;
} {
  let seriesSlug: string | null = null;
  let seriesTitle: string | null = null;
  let seriesOrder: number | null = null;

  if (typeof data.series === "string" && data.series.trim()) {
    seriesSlug = slugify(data.series);
    seriesTitle = titleFromSlug(seriesSlug);
  } else if (data.series && typeof data.series === "object") {
    const series = data.series as Record<string, unknown>;
    const slugSource =
      typeof series.slug === "string"
        ? series.slug
        : typeof series.name === "string"
          ? series.name
          : typeof series.title === "string"
            ? series.title
            : "";
    if (slugSource.trim()) {
      seriesSlug = slugify(slugSource);
      seriesTitle =
        typeof series.title === "string" && series.title.trim()
          ? series.title.trim()
          : typeof series.name === "string" && series.name.trim()
            ? series.name.trim()
            : titleFromSlug(seriesSlug);
      if (typeof series.order === "number" && Number.isFinite(series.order)) {
        seriesOrder = series.order;
      } else if (typeof series.order === "string" && series.order.trim()) {
        const parsed = Number(series.order);
        if (Number.isFinite(parsed)) seriesOrder = parsed;
      }
    }
  }

  if (typeof data.seriesSlug === "string" && data.seriesSlug.trim()) {
    seriesSlug = slugify(data.seriesSlug);
  }
  if (typeof data.seriesTitle === "string" && data.seriesTitle.trim()) {
    seriesTitle = data.seriesTitle.trim();
  }

  const orderRaw = data.seriesOrder ?? data.order;
  if (typeof orderRaw === "number" && Number.isFinite(orderRaw)) {
    seriesOrder = orderRaw;
  } else if (typeof orderRaw === "string" && orderRaw.trim()) {
    const parsed = Number(orderRaw);
    if (Number.isFinite(parsed)) seriesOrder = parsed;
  }

  if (seriesSlug && !seriesTitle) {
    seriesTitle = titleFromSlug(seriesSlug);
  }
  if (!seriesSlug) {
    return { seriesSlug: null, seriesTitle: null, seriesOrder: null };
  }

  return { seriesSlug, seriesTitle, seriesOrder };
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

  const series = parseSeries(data as Record<string, unknown>);

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
    ...series,
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
