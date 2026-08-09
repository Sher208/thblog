import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostWithEditor } from "@/components/post-with-editor";
import { getPostBySlug } from "@/lib/posts";
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

  return {
    title: post.title,
    description: post.excerpt || undefined,
    robots:
      post.visibility === "private"
        ? { index: false, follow: false }
        : undefined,
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

  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
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
          tags: post.tags,
          toc: post.toc,
        }}
      />
    </Suspense>
  );
}
