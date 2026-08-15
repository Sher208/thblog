"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { PostWithTags } from "@/lib/posts";
import { formatReadingTime } from "@/lib/reading-time";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

function PostLinkContents({ title }: { title: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span className={cn(pending && "text-primary")}>{title}</span>
      {pending ? (
        <Loader2
          className="ml-2 inline size-4 animate-spin text-primary align-[-0.125em]"
          aria-hidden
        />
      ) : null}
      {pending ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg bg-primary/5 ring-1 ring-inset ring-primary/25"
        />
      ) : null}
      <span className="sr-only">{pending ? "Loading article" : null}</span>
    </>
  );
}

export function PostList({
  posts,
  emptyLabel = "No public posts yet.",
}: {
  posts: PostWithTags[];
  emptyLabel?: string;
}) {
  if (!posts.length) {
    return <p className="py-8 text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {posts.map((post, index) => {
        const date = post.publishedAt ?? post.createdAt;
        return (
          <li
            key={post.id}
            className={`animate-fade-up stagger-${Math.min(index + 1, 3)}`}
          >
            <article className="group relative rounded-lg border border-border px-4 py-7 transition-colors hover:bg-muted/40 sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-foreground no-underline transition after:absolute after:inset-0 group-hover:text-primary"
                  >
                    <PostLinkContents title={post.title} />
                  </Link>
                </h2>
                <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums text-muted-foreground">
                  {date ? (
                    <time dateTime={toDateTime(date)}>{formatDate(date)}</time>
                  ) : null}
                  <span aria-hidden>·</span>
                  <span>{formatReadingTime(post.readingMinutes)}</span>
                </div>
              </div>
              {post.excerpt ? (
                <p className="mt-2.5 max-w-xl text-base leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
              ) : null}
              {post.series || post.tags.length ? (
                <ul className="relative z-10 mt-3.5 flex flex-wrap gap-2">
                  {post.series ? (
                    <li>
                      <Badge
                        variant="outline"
                        render={<Link href={`/series/${post.series.slug}`} />}
                        className="no-underline"
                      >
                        {post.series.title}
                        {post.series.order != null
                          ? ` · ${post.series.order}`
                          : ""}
                      </Badge>
                    </li>
                  ) : null}
                  {post.tags.map((tag) => (
                    <li key={tag.id}>
                      <Badge
                        variant="secondary"
                        render={<Link href={`/tags/${tag.slug}`} />}
                        className="no-underline"
                      >
                        {tag.name}
                      </Badge>
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
