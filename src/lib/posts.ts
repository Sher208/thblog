import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { postTags, posts, tags, type Visibility } from "./db/schema";
import { createId } from "./id";
import {
  parseMarkdownFile,
  renderMarkdown,
  type ParsedMarkdown,
  type TocItem,
} from "./markdown";

function slugifyTag(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type PostWithTags = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  bodyHtml: string;
  toc: TocItem[];
  visibility: Visibility;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags: { id: string; name: string; slug: string }[];
};

async function ensureTags(tagNames: string[]) {
  const result: { id: string; name: string; slug: string }[] = [];

  for (const name of tagNames) {
    const slug = slugifyTag(name);
    if (!slug) continue;

    const existing = await db.query.tags.findFirst({
      where: eq(tags.slug, slug),
    });

    if (existing) {
      result.push(existing);
      continue;
    }

    const created = {
      id: createId("tag"),
      name,
      slug,
    };
    await db.insert(tags).values(created);
    result.push(created);
  }

  return result;
}

async function setPostTags(postId: string, tagNames: string[]) {
  const resolved = await ensureTags(tagNames);
  await db.delete(postTags).where(eq(postTags.postId, postId));
  if (resolved.length) {
    await db.insert(postTags).values(
      resolved.map((tag) => ({
        postId,
        tagId: tag.id,
      })),
    );
  }
  return resolved;
}

function mapPost(
  post: typeof posts.$inferSelect,
  postTagRows: {
    tag: { id: string; name: string; slug: string };
  }[],
): PostWithTags {
  let toc: TocItem[] = [];
  try {
    toc = JSON.parse(post.tocJson) as TocItem[];
  } catch {
    toc = [];
  }

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    bodyMd: post.bodyMd,
    bodyHtml: post.bodyHtml,
    toc,
    visibility: post.visibility,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    tags: postTagRows.map((row) => row.tag),
  };
}

export async function listPublicPosts(): Promise<PostWithTags[]> {
  const rows = await db.query.posts.findMany({
    where: eq(posts.visibility, "public"),
    orderBy: [desc(posts.publishedAt), desc(posts.createdAt)],
    with: {
      postTags: {
        with: { tag: true },
      },
    },
  });

  return rows.map((row) => mapPost(row, row.postTags));
}

export async function listAllPosts(): Promise<PostWithTags[]> {
  const rows = await db.query.posts.findMany({
    orderBy: [desc(posts.updatedAt)],
    with: {
      postTags: {
        with: { tag: true },
      },
    },
  });

  return rows.map((row) => mapPost(row, row.postTags));
}

export async function getPostBySlug(
  slug: string,
): Promise<PostWithTags | null> {
  const row = await db.query.posts.findFirst({
    where: eq(posts.slug, slug),
    with: {
      postTags: {
        with: { tag: true },
      },
    },
  });

  return row ? mapPost(row, row.postTags) : null;
}

export async function getPostById(id: string): Promise<PostWithTags | null> {
  const row = await db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: {
      postTags: {
        with: { tag: true },
      },
    },
  });

  return row ? mapPost(row, row.postTags) : null;
}

export async function listPublicPostsByTag(
  tagSlug: string,
): Promise<{ tag: { id: string; name: string; slug: string }; posts: PostWithTags[] } | null> {
  const tag = await db.query.tags.findFirst({
    where: eq(tags.slug, tagSlug),
  });
  if (!tag) return null;

  const links = await db.query.postTags.findMany({
    where: eq(postTags.tagId, tag.id),
  });
  const postIds = links.map((link) => link.postId);
  if (!postIds.length) {
    return { tag, posts: [] };
  }

  const rows = await db.query.posts.findMany({
    where: and(inArray(posts.id, postIds), eq(posts.visibility, "public")),
    orderBy: [desc(posts.publishedAt), desc(posts.createdAt)],
    with: {
      postTags: {
        with: { tag: true },
      },
    },
  });

  return { tag, posts: rows.map((row) => mapPost(row, row.postTags)) };
}

export async function listPublicTags() {
  const publicPosts = await db.query.posts.findMany({
    where: eq(posts.visibility, "public"),
    columns: { id: true },
  });
  const publicIds = publicPosts.map((post) => post.id);
  if (!publicIds.length) return [];

  const links = await db.query.postTags.findMany({
    where: inArray(postTags.postId, publicIds),
    with: { tag: true },
  });

  const map = new Map<string, { id: string; name: string; slug: string; count: number }>();
  for (const link of links) {
    const existing = map.get(link.tag.id);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(link.tag.id, { ...link.tag, count: 1 });
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function upsertFromParsed(
  parsed: ParsedMarkdown,
  options?: { id?: string; visibilityOverride?: Visibility },
): Promise<PostWithTags> {
  const { html, toc } = await renderMarkdown(parsed.bodyMd);
  const now = new Date();
  const visibility = options?.visibilityOverride ?? parsed.visibility;
  const publishedAt =
    visibility === "public"
      ? parsed.publishedAt ?? now
      : parsed.publishedAt;

  const existing = options?.id
    ? await db.query.posts.findFirst({ where: eq(posts.id, options.id) })
    : await db.query.posts.findFirst({ where: eq(posts.slug, parsed.slug) });

  if (existing) {
    await db
      .update(posts)
      .set({
        slug: parsed.slug,
        title: parsed.title,
        excerpt: parsed.excerpt,
        bodyMd: parsed.bodyMd,
        bodyHtml: html,
        tocJson: JSON.stringify(toc),
        visibility,
        publishedAt:
          visibility === "public"
            ? existing.publishedAt ?? publishedAt ?? now
            : publishedAt,
        updatedAt: now,
      })
      .where(eq(posts.id, existing.id));

    await setPostTags(existing.id, parsed.tags);
    const updated = await getPostById(existing.id);
    if (!updated) throw new Error("Failed to load updated post");
    return updated;
  }

  const id = createId("post");
  await db.insert(posts).values({
    id,
    slug: parsed.slug,
    title: parsed.title,
    excerpt: parsed.excerpt,
    bodyMd: parsed.bodyMd,
    bodyHtml: html,
    tocJson: JSON.stringify(toc),
    visibility,
    publishedAt: visibility === "public" ? publishedAt ?? now : publishedAt,
    createdAt: now,
    updatedAt: now,
  });

  await setPostTags(id, parsed.tags);
  const created = await getPostById(id);
  if (!created) throw new Error("Failed to load created post");
  return created;
}

export async function createPostFromMarkdown(
  raw: string,
  filename?: string,
): Promise<PostWithTags> {
  const parsed = parseMarkdownFile(raw, filename);
  return upsertFromParsed(parsed);
}

export async function updatePostVisibility(
  id: string,
  visibility: Visibility,
): Promise<PostWithTags | null> {
  const existing = await getPostById(id);
  if (!existing) return null;

  const now = new Date();
  await db
    .update(posts)
    .set({
      visibility,
      publishedAt:
        visibility === "public"
          ? existing.publishedAt ?? now
          : existing.publishedAt,
      updatedAt: now,
    })
    .where(eq(posts.id, id));

  return getPostById(id);
}

export async function updatePostMeta(
  id: string,
  data: {
    title?: string;
    slug?: string;
    excerpt?: string;
    visibility?: Visibility;
    tags?: string[];
    bodyMd?: string;
  },
): Promise<PostWithTags | null> {
  const existing = await getPostById(id);
  if (!existing) return null;

  const bodyMd = data.bodyMd ?? existing.bodyMd;
  const { html, toc } =
    data.bodyMd !== undefined
      ? await renderMarkdown(bodyMd)
      : { html: existing.bodyHtml, toc: existing.toc };

  const visibility = data.visibility ?? existing.visibility;
  const now = new Date();

  await db
    .update(posts)
    .set({
      title: data.title ?? existing.title,
      slug: data.slug ?? existing.slug,
      excerpt: data.excerpt ?? existing.excerpt,
      bodyMd,
      bodyHtml: html,
      tocJson: JSON.stringify(toc),
      visibility,
      publishedAt:
        visibility === "public"
          ? existing.publishedAt ?? now
          : existing.publishedAt,
      updatedAt: now,
    })
    .where(eq(posts.id, id));

  if (data.tags) {
    await setPostTags(id, data.tags);
  }

  return getPostById(id);
}

export async function deletePost(id: string): Promise<boolean> {
  const result = await db.delete(posts).where(eq(posts.id, id));
  return (result.rowsAffected ?? 0) > 0;
}
