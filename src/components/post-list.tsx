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

export function PostList({
  posts,
  emptyLabel = "No public posts yet.",
}: {
  posts: PostWithTags[];
  emptyLabel?: string;
}) {
  if (!posts.length) {
    return <p className="text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-border/80">
      {posts.map((post, index) => (
        <li
          key={post.id}
          className={`animate-fade-up py-6 stagger-${Math.min(index + 1, 3)}`}
        >
          <Link href={`/blog/${post.slug}`} className="group block">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight text-foreground transition group-hover:text-accent sm:text-2xl">
                {post.title}
              </h2>
              <time className="text-xs text-muted">
                {formatDate(post.publishedAt ?? post.createdAt)}
              </time>
            </div>
            {post.excerpt ? (
              <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-muted">
                {post.excerpt}
              </p>
            ) : null}
            {post.tags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs tracking-wide text-accent"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
