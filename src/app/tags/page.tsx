import Link from "next/link";
import { listPublicTags } from "@/lib/posts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Topics",
};

export default async function TagsPage() {
  const tags = await listPublicTags();

  return (
    <div className="animate-fade-up">
      <header className="border-b border-border/70 pb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Topics
        </h1>
        <p className="mt-3 text-lg text-muted">
          Browse public posts by pattern or area.
        </p>
      </header>
      <ul className="mt-2 divide-y divide-border/80">
        {tags.map((tag) => (
          <li key={tag.id} className="py-5">
            <Link
              href={`/tags/${tag.slug}`}
              className="flex min-h-11 items-baseline justify-between gap-4 text-foreground no-underline transition hover:text-accent"
            >
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                {tag.name}
              </span>
              <span className="text-sm tabular-nums text-muted">{tag.count}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!tags.length ? (
        <p className="mt-8 text-muted">No topics yet.</p>
      ) : null}
    </div>
  );
}
