import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadingProgress } from "@/components/reading-progress";
import { TableOfContents } from "@/components/table-of-contents";
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

  return (
    <article id="post-article" className="animate-fade-up pb-16">
      <ReadingProgress />
      {post.visibility === "private" ? (
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-accent">
          Private
        </p>
      ) : null}
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <time>{formatDate(post.publishedAt ?? post.createdAt)}</time>
          {post.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className="hover:text-accent"
            >
              {tag.name}
            </Link>
          ))}
        </div>
        {post.excerpt ? (
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            {post.excerpt}
          </p>
        ) : null}
      </header>

      <TableOfContents items={post.toc} />

      <div
        className="prose-blog"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />
    </article>
  );
}
