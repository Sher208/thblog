import Link from "next/link";
import type { PostWithTags } from "@/lib/posts";
import { formatReadingTime } from "@/lib/reading-time";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SeriesNav({
  seriesTitle,
  seriesSlug,
  previous,
  next,
  index,
  total,
}: {
  seriesTitle: string;
  seriesSlug: string;
  previous: Pick<PostWithTags, "slug" | "title"> | null;
  next: Pick<PostWithTags, "slug" | "title"> | null;
  index: number;
  total: number;
}) {
  return (
    <section
      aria-label="Series navigation"
      className="mt-12 border-t border-border pt-8"
    >
      <p className="text-sm text-muted-foreground">
        Part {index} of {total} in{" "}
        <Link
          href={`/series/${seriesSlug}`}
          className="text-foreground no-underline hover:text-primary"
        >
          {seriesTitle}
        </Link>
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {previous ? (
          <Link
            href={`/blog/${previous.slug}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-auto justify-start whitespace-normal px-4 py-3 text-left no-underline",
            )}
          >
            <span className="block text-xs text-muted-foreground">Previous</span>
            <span className="mt-0.5 block font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
              {previous.title}
            </span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/blog/${next.slug}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-auto justify-end whitespace-normal px-4 py-3 text-right no-underline sm:justify-end",
            )}
          >
            <span className="block text-xs text-muted-foreground">Next</span>
            <span className="mt-0.5 block font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
              {next.title}
            </span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function RelatedPosts({ posts }: { posts: PostWithTags[] }) {
  if (!posts.length) return null;

  return (
    <section aria-label="Related posts" className="mt-12 border-t border-border pt-8">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
        Related
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {posts.map((post) => (
          <li key={post.id}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block rounded-lg border border-border px-4 py-3 no-underline transition hover:bg-muted/40"
            >
              <span className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-foreground group-hover:text-primary">
                {post.title}
              </span>
              <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{formatReadingTime(post.readingMinutes)}</span>
                {post.series ? <span>{post.series.title}</span> : null}
                {post.tags.slice(0, 2).map((tag) => (
                  <span key={tag.id}>{tag.name}</span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
