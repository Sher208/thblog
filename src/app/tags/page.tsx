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
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
        Topics
      </h1>
      <p className="mt-2 text-muted">Browse public posts by pattern or area.</p>
      <ul className="mt-8 divide-y divide-border">
        {tags.map((tag) => (
          <li key={tag.id} className="py-4">
            <Link
              href={`/tags/${tag.slug}`}
              className="flex items-baseline justify-between gap-4 hover:text-accent"
            >
              <span className="font-[family-name:var(--font-display)] text-xl">
                {tag.name}
              </span>
              <span className="text-sm text-muted">{tag.count}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!tags.length ? (
        <p className="mt-6 text-muted">No topics yet.</p>
      ) : null}
    </div>
  );
}
