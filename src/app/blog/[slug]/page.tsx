import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ReadingProgress } from "@/components/reading-progress";
import { TableOfContents } from "@/components/table-of-contents";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getPostBySlug } from "@/lib/posts";
import { getServerSession } from "@/lib/session";
import { cn } from "@/lib/utils";

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
    <article id="post-article" className="animate-fade-up pb-16">
      <ReadingProgress />
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "-ml-2 mb-6 text-muted-foreground no-underline",
        )}
      >
        <ArrowLeft data-icon="inline-start" />
        All posts
      </Link>

      {post.visibility === "private" ? (
        <Badge variant="secondary" className="mb-4">
          Private
        </Badge>
      ) : null}

      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          {date ? (
            <time dateTime={toDateTime(date)}>{formatDate(date)}</time>
          ) : null}
          {post.tags.length ? (
            <ul className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li key={tag.id}>
                  <Badge
                    variant="outline"
                    render={<Link href={`/tags/${tag.slug}`} />}
                    className="no-underline"
                  >
                    {tag.name}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {post.excerpt ? (
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}
      </header>

      <Separator className="mb-10" />

      <TableOfContents items={post.toc} />

      <div
        className="prose-blog"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />
    </article>
  );
}
