import { and, asc, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { cache } from "react";
import { db } from "./db";
import {
  postTags,
  postVersions,
  posts,
  tags,
  type Visibility,
  type VersionKind,
} from "./db/schema";
import { createId } from "./id";
import {
  parseMarkdownFile,
  renderMarkdown,
  type ParsedMarkdown,
  type TocItem,
} from "./markdown";
import { estimateReadingMinutes } from "./reading-time";

function slugifyTag(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type PostSeries = {
  slug: string;
  title: string;
  order: number | null;
};

export type PostWithTags = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  bodyHtml: string;
  toc: TocItem[];
  visibility: Visibility;
  series: PostSeries | null;
  readingMinutes: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags: { id: string; name: string; slug: string }[];
};

export type SearchResult = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  readingMinutes: number;
  seriesTitle: string | null;
  tags: { id: string; name: string; slug: string }[];
  score: number;
};

export type SeriesSummary = {
  slug: string;
  title: string;
  count: number;
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

  const series = post.seriesSlug
    ? {
        slug: post.seriesSlug,
        title:
          post.seriesTitle ||
          post.seriesSlug
            .split("-")
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
        order: post.seriesOrder,
      }
    : null;

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    bodyMd: post.bodyMd,
    bodyHtml: post.bodyHtml,
    toc,
    visibility: post.visibility,
    series,
    readingMinutes: estimateReadingMinutes(post.bodyMd),
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

export const getPostBySlug = cache(
  async (slug: string): Promise<PostWithTags | null> => {
    const row = await db.query.posts.findFirst({
      where: eq(posts.slug, slug),
      with: {
        postTags: {
          with: { tag: true },
        },
      },
    });

    return row ? mapPost(row, row.postTags) : null;
  },
);

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

function scoreSearchMatch(
  query: string,
  post: PostWithTags,
): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const terms = q.split(/\s+/).filter(Boolean);
  let score = 0;

  const title = post.title.toLowerCase();
  const excerpt = post.excerpt.toLowerCase();
  const body = post.bodyMd.toLowerCase();
  const tagText = post.tags.map((tag) => tag.name.toLowerCase()).join(" ");
  const seriesText = [
    post.series?.title ?? "",
    post.series?.slug ?? "",
  ]
    .join(" ")
    .toLowerCase();

  for (const term of terms) {
    if (title === term) score += 120;
    else if (title.includes(term)) score += 80;
    if (tagText.includes(term)) score += 50;
    if (seriesText.includes(term)) score += 40;
    if (excerpt.includes(term)) score += 30;
    if (body.includes(term)) score += 10;
  }

  if (title.includes(q)) score += 40;
  return score;
}

export async function searchPosts(
  query: string,
  options?: { includePrivate?: boolean; limit?: number },
): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const limit = options?.limit ?? 20;
  const rows = options?.includePrivate
    ? await listAllPosts()
    : await listPublicPosts();

  return rows
    .map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      readingMinutes: post.readingMinutes,
      seriesTitle: post.series?.title ?? null,
      tags: post.tags,
      score: scoreSearchMatch(q, post),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export async function listPublicSeries(): Promise<SeriesSummary[]> {
  const rows = await db.query.posts.findMany({
    where: and(eq(posts.visibility, "public"), isNotNull(posts.seriesSlug)),
    columns: {
      seriesSlug: true,
      seriesTitle: true,
    },
  });

  const map = new Map<string, SeriesSummary>();
  for (const row of rows) {
    if (!row.seriesSlug || !row.seriesTitle) continue;
    const existing = map.get(row.seriesSlug);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(row.seriesSlug, {
        slug: row.seriesSlug,
        title: row.seriesTitle,
        count: 1,
      });
    }
  }

  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export async function listPublicPostsBySeries(
  seriesSlug: string,
): Promise<{ series: SeriesSummary; posts: PostWithTags[] } | null> {
  const rows = await db.query.posts.findMany({
    where: and(
      eq(posts.visibility, "public"),
      eq(posts.seriesSlug, seriesSlug),
    ),
    orderBy: [asc(posts.seriesOrder), asc(posts.publishedAt), asc(posts.createdAt)],
    with: {
      postTags: {
        with: { tag: true },
      },
    },
  });

  if (!rows.length) return null;

  const mapped = rows.map((row) => mapPost(row, row.postTags));
  const title = mapped[0]?.series?.title ?? seriesSlug;

  return {
    series: { slug: seriesSlug, title, count: mapped.length },
    posts: mapped,
  };
}

export async function getSeriesNeighbors(
  post: PostWithTags,
  options?: { includePrivate?: boolean },
): Promise<{
  previous: PostWithTags | null;
  next: PostWithTags | null;
  posts: PostWithTags[];
}> {
  if (!post.series) {
    return { previous: null, next: null, posts: [] };
  }

  const seriesPosts = options?.includePrivate
    ? await listSeriesPostsIncludingPrivate(post.series.slug)
    : ((await listPublicPostsBySeries(post.series.slug))?.posts ?? []);

  const index = seriesPosts.findIndex((item) => item.id === post.id);
  if (index < 0) {
    return { previous: null, next: null, posts: seriesPosts };
  }

  return {
    previous: index > 0 ? seriesPosts[index - 1]! : null,
    next: index < seriesPosts.length - 1 ? seriesPosts[index + 1]! : null,
    posts: seriesPosts,
  };
}

async function listSeriesPostsIncludingPrivate(
  seriesSlug: string,
): Promise<PostWithTags[]> {
  const rows = await db.query.posts.findMany({
    where: eq(posts.seriesSlug, seriesSlug),
    orderBy: [asc(posts.seriesOrder), asc(posts.publishedAt), asc(posts.createdAt)],
    with: {
      postTags: {
        with: { tag: true },
      },
    },
  });
  return rows.map((row) => mapPost(row, row.postTags));
}

export async function listRelatedPosts(
  post: PostWithTags,
  limit = 3,
): Promise<PostWithTags[]> {
  if (!post.tags.length) {
    return [];
  }

  const tagIds = post.tags.map((tag) => tag.id);
  const links = await db.query.postTags.findMany({
    where: inArray(postTags.tagId, tagIds),
  });

  const overlap = new Map<string, number>();
  for (const link of links) {
    if (link.postId === post.id) continue;
    overlap.set(link.postId, (overlap.get(link.postId) ?? 0) + 1);
  }

  const candidateIds = [...overlap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  if (!candidateIds.length) return [];

  const rows = await db.query.posts.findMany({
    where: and(
      inArray(posts.id, candidateIds),
      eq(posts.visibility, "public"),
      ne(posts.id, post.id),
    ),
    with: {
      postTags: {
        with: { tag: true },
      },
    },
  });

  const mapped = rows.map((row) => mapPost(row, row.postTags));
  mapped.sort((a, b) => {
    const scoreDiff = (overlap.get(b.id) ?? 0) - (overlap.get(a.id) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    const aTime = (a.publishedAt ?? a.createdAt).getTime();
    const bTime = (b.publishedAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });

  return mapped.slice(0, limit);
}

export type PostVersionRecord = {
  id: string;
  postId: string;
  kind: VersionKind;
  title: string;
  slug: string;
  excerpt: string;
  bodyMd: string;
  visibility: Visibility;
  tags: string[];
  createdAt: Date;
};

function parseTagsJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    return [];
  }
}

function mapVersion(
  row: typeof postVersions.$inferSelect,
): PostVersionRecord {
  return {
    id: row.id,
    postId: row.postId,
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    bodyMd: row.bodyMd,
    visibility: row.visibility,
    tags: parseTagsJson(row.tagsJson),
    createdAt: row.createdAt,
  };
}

async function insertManualVersion(snapshot: {
  postId: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyMd: string;
  visibility: Visibility;
  tags: string[];
}) {
  await db.insert(postVersions).values({
    id: createId("ver"),
    postId: snapshot.postId,
    kind: "manual",
    title: snapshot.title,
    slug: snapshot.slug,
    excerpt: snapshot.excerpt,
    bodyMd: snapshot.bodyMd,
    visibility: snapshot.visibility,
    tagsJson: JSON.stringify(snapshot.tags),
    createdAt: new Date(),
  });
}

async function upsertDraftVersion(snapshot: {
  postId: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyMd: string;
  visibility: Visibility;
  tags: string[];
}) {
  const existing = await db.query.postVersions.findFirst({
    where: and(
      eq(postVersions.postId, snapshot.postId),
      eq(postVersions.kind, "draft"),
    ),
  });

  const now = new Date();
  if (existing) {
    await db
      .update(postVersions)
      .set({
        title: snapshot.title,
        slug: snapshot.slug,
        excerpt: snapshot.excerpt,
        bodyMd: snapshot.bodyMd,
        visibility: snapshot.visibility,
        tagsJson: JSON.stringify(snapshot.tags),
        createdAt: now,
      })
      .where(eq(postVersions.id, existing.id));
    return;
  }

  await db.insert(postVersions).values({
    id: createId("ver"),
    postId: snapshot.postId,
    kind: "draft",
    title: snapshot.title,
    slug: snapshot.slug,
    excerpt: snapshot.excerpt,
    bodyMd: snapshot.bodyMd,
    visibility: snapshot.visibility,
    tagsJson: JSON.stringify(snapshot.tags),
    createdAt: now,
  });
}

async function clearDraftVersions(postId: string) {
  await db
    .delete(postVersions)
    .where(
      and(eq(postVersions.postId, postId), eq(postVersions.kind, "draft")),
    );
}

export async function listPostVersions(
  postId: string,
): Promise<PostVersionRecord[]> {
  const rows = await db.query.postVersions.findMany({
    where: eq(postVersions.postId, postId),
    orderBy: [desc(postVersions.createdAt)],
  });
  return rows.map(mapVersion);
}

export async function getPostVersion(
  versionId: string,
): Promise<PostVersionRecord | null> {
  const row = await db.query.postVersions.findFirst({
    where: eq(postVersions.id, versionId),
  });
  return row ? mapVersion(row) : null;
}

export async function restorePostVersion(
  postId: string,
  versionId: string,
): Promise<PostWithTags | null> {
  const existing = await getPostById(postId);
  const version = await getPostVersion(versionId);
  if (!existing || !version || version.postId !== postId) return null;

  // Keep current live content as a manual version before rollback.
  await insertManualVersion({
    postId,
    title: existing.title,
    slug: existing.slug,
    excerpt: existing.excerpt,
    bodyMd: existing.bodyMd,
    visibility: existing.visibility,
    tags: existing.tags.map((tag) => tag.name),
  });

  const restored = await updatePostMeta(
    postId,
    {
      title: version.title,
      slug: version.slug,
      excerpt: version.excerpt,
      visibility: version.visibility,
      tags: version.tags,
      bodyMd: version.bodyMd,
    },
    { version: null },
  );

  if (restored) {
    await clearDraftVersions(postId);
  }

  return restored;
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
        seriesSlug: parsed.seriesSlug,
        seriesTitle: parsed.seriesTitle,
        seriesOrder: parsed.seriesOrder,
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

    await insertManualVersion({
      postId: updated.id,
      title: updated.title,
      slug: updated.slug,
      excerpt: updated.excerpt,
      bodyMd: updated.bodyMd,
      visibility: updated.visibility,
      tags: updated.tags.map((tag) => tag.name),
    });
    await clearDraftVersions(updated.id);
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
    seriesSlug: parsed.seriesSlug,
    seriesTitle: parsed.seriesTitle,
    seriesOrder: parsed.seriesOrder,
    publishedAt: visibility === "public" ? publishedAt ?? now : publishedAt,
    createdAt: now,
    updatedAt: now,
  });

  await setPostTags(id, parsed.tags);
  const created = await getPostById(id);
  if (!created) throw new Error("Failed to load created post");

  await insertManualVersion({
    postId: created.id,
    title: created.title,
    slug: created.slug,
    excerpt: created.excerpt,
    bodyMd: created.bodyMd,
    visibility: created.visibility,
    tags: created.tags.map((tag) => tag.name),
  });
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
    seriesSlug?: string | null;
    seriesTitle?: string | null;
    seriesOrder?: number | null;
  },
  options?: { version?: VersionKind | null },
): Promise<PostWithTags | null> {
  const existing = await getPostById(id);
  if (!existing) return null;

  const bodyMd = data.bodyMd ?? existing.bodyMd;
  const { html, toc } =
    data.bodyMd !== undefined
      ? await renderMarkdown(bodyMd)
      : { html: existing.bodyHtml, toc: existing.toc };

  const visibility = data.visibility ?? existing.visibility;
  const title = data.title ?? existing.title;
  const slug = data.slug ?? existing.slug;
  const excerpt = data.excerpt ?? existing.excerpt;
  const tagNames = data.tags ?? existing.tags.map((tag) => tag.name);

  const nextSeriesSlug =
    data.seriesSlug !== undefined
      ? data.seriesSlug?.trim()
        ? slugifyTag(data.seriesSlug)
        : null
      : existing.series?.slug ?? null;
  const nextSeriesTitle =
    data.seriesTitle !== undefined
      ? data.seriesTitle?.trim() || null
      : existing.series?.title ?? null;
  const nextSeriesOrder =
    data.seriesOrder !== undefined
      ? data.seriesOrder
      : existing.series?.order ?? null;

  const seriesSlug = nextSeriesSlug;
  const seriesTitle = seriesSlug
    ? nextSeriesTitle ||
      seriesSlug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : null;
  const seriesOrder = seriesSlug ? nextSeriesOrder : null;

  const now = new Date();

  await db
    .update(posts)
    .set({
      title,
      slug,
      excerpt,
      bodyMd,
      bodyHtml: html,
      tocJson: JSON.stringify(toc),
      visibility,
      seriesSlug,
      seriesTitle,
      seriesOrder,
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

  const versionMode = options?.version ?? null;
  if (versionMode === "manual") {
    await insertManualVersion({
      postId: id,
      title,
      slug,
      excerpt,
      bodyMd,
      visibility,
      tags: tagNames,
    });
    await clearDraftVersions(id);
  } else if (versionMode === "draft") {
    await upsertDraftVersion({
      postId: id,
      title,
      slug,
      excerpt,
      bodyMd,
      visibility,
      tags: tagNames,
    });
  }

  return getPostById(id);
}

export async function deletePost(id: string): Promise<boolean> {
  const result = await db.delete(posts).where(eq(posts.id, id));
  return (result.rowsAffected ?? 0) > 0;
}
