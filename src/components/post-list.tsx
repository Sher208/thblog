import Link from "next/link";
import type { PostWithTags } from "@/lib/posts";

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toDateTime(date: Date | null) {
  if (!date) return undefined;
  return date.toISOString().slice(0, 10);
}

export function PostList({
  posts,
  emptyLabel = "No public posts yet.",
}: {
  posts: PostWithTags[];
  emptyLabel?: string;
}) {
  if (!posts.length) {
    return <p className="py-8 text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-border/80">
      {posts.map((post, index) => {
        const date = post.publishedAt ?? post.createdAt;
        return (
          <li
            key={post.id}
            className={`animate-fade-up py-7 stagger-${Math.min(index + 1, 3)}`}
          >
            <article>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-foreground no-underline transition hover:text-accent"
                  >
                    {post.title}
                  </Link>
                </h2>
                {date ? (
                  <time
                    dateTime={toDateTime(date)}
                    className="shrink-0 text-sm tabular-nums text-muted"
                  >
                    {formatDate(date)}
                  </time>
                ) : null}
              </div>
              {post.excerpt ? (
                <p className="mt-2.5 max-w-xl text-base leading-relaxed text-muted">
                  {post.excerpt}
                </p>
              ) : null}
              {post.tags.length ? (
                <ul className="mt-3.5 flex flex-wrap gap-x-3 gap-y-1.5">
                  {post.tags.map((tag) => (
                    <li key={tag.id}>
                      <Link
                        href={`/tags/${tag.slug}`}
                        className="text-sm text-accent no-underline transition hover:underline"
                      >
                        {tag.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
