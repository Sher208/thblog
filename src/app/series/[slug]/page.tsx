import { notFound } from "next/navigation";
import { PostList } from "@/components/post-list";
import { listPublicPostsBySeries } from "@/lib/posts";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const result = await listPublicPostsBySeries(slug);
  if (!result) return { title: "Not found" };
  return {
    title: result.series.title,
    description: `${result.series.count} part series`,
  };
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const result = await listPublicPostsBySeries(slug);
  if (!result) notFound();

  return (
    <div className="animate-fade-up">
      <header className="border-b border-border/70 pb-8">
        <p className="text-sm text-muted-foreground">Series</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {result.series.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {result.series.count} public{" "}
          {result.series.count === 1 ? "part" : "parts"}
        </p>
      </header>
      <div className="mt-2">
        <PostList
          posts={result.posts}
          emptyLabel="No public posts in this series."
        />
      </div>
    </div>
  );
}
