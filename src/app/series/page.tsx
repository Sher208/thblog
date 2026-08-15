import Link from "next/link";
import { listPublicSeries } from "@/lib/posts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Series",
};

export default async function SeriesIndexPage() {
  const series = await listPublicSeries();

  return (
    <div className="animate-fade-up">
      <header className="pb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Series
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Multi-part notes grouped into reading paths.
        </p>
      </header>
      <Separator className="mb-2" />
      <ul>
        {series.map((item, index) => (
          <li key={item.slug}>
            {index > 0 ? <Separator /> : null}
            <Link
              href={`/series/${item.slug}`}
              className="flex min-h-14 items-center justify-between gap-4 py-4 text-foreground no-underline transition hover:text-primary"
            >
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                {item.title}
              </span>
              <Badge variant="secondary">
                {item.count} {item.count === 1 ? "part" : "parts"}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
      {!series.length ? (
        <p className="mt-8 text-muted-foreground">No series yet.</p>
      ) : null}
    </div>
  );
}
