import Link from "next/link";
import { listPublicTags } from "@/lib/posts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Topics",
};

export default async function TagsPage() {
  const tags = await listPublicTags();

  return (
    <div className="animate-fade-up">
      <header className="pb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Topics
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Browse public posts by pattern or area.
        </p>
      </header>
      <Separator className="mb-2" />
      <ul>
        {tags.map((tag, index) => (
          <li key={tag.id}>
            {index > 0 ? <Separator /> : null}
            <Link
              href={`/tags/${tag.slug}`}
              className="flex min-h-14 items-center justify-between gap-4 py-4 text-foreground no-underline transition hover:text-primary"
            >
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                {tag.name}
              </span>
              <Badge variant="secondary">{tag.count}</Badge>
            </Link>
          </li>
        ))}
      </ul>
      {!tags.length ? (
        <p className="mt-8 text-muted-foreground">No topics yet.</p>
      ) : null}
    </div>
  );
}
