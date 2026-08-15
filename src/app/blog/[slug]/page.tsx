import { notFound } from "next/navigation";
import { PostWithEditor } from "@/components/post-with-editor";
import {
  getPostBySlug,
  getSeriesNeighbors,
  listRelatedPosts,
} from "@/lib/posts";
import { formatReadingTime } from "@/lib/reading-time";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toDateTime(date: Date | null) {
  if (!date) return undefined;
  return date.toISOString().slice(0, 10);
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const session = await getServerSession();

  if (!post || (post.visibility === "private" && !session)) {
    return { title: "Not found" };
  }

  const description = post.excerpt || undefined;

  return {
    title: post.title,
    description,
    robots:
      post.visibility === "private"
        ? { index: false, follow: false }
        : undefined,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: post.tags.map((tag) => tag.name),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, session] = await Promise.all([
    getPostBySlug(slug),
    getServerSession(),
  ]);

  if (!post) notFound();
  if (post.visibility === "private" && !session) notFound();

  const date = post.publishedAt ?? post.createdAt;
  const [neighbors, related] = await Promise.all([
    getSeriesNeighbors(post, { includePrivate: Boolean(session) }),
    listRelatedPosts(post),
  ]);

  const seriesIndex = neighbors.posts.findIndex((item) => item.id === post.id);

  return (
    <PostWithEditor
      canEdit={Boolean(session)}
      post={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        bodyMd: post.bodyMd,
        bodyHtml: post.bodyHtml,
        visibility: post.visibility,
        publishedLabel: formatDate(date),
        publishedDateTime: toDateTime(date),
        readingLabel: formatReadingTime(post.readingMinutes),
        series: post.series,
        tags: post.tags,
        toc: post.toc,
      }}
      seriesNav={
        post.series && seriesIndex >= 0
          ? {
              previous: neighbors.previous,
              next: neighbors.next,
              index: seriesIndex + 1,
              total: neighbors.posts.length,
            }
          : null
      }
      relatedPosts={related}
    />
  );
}
