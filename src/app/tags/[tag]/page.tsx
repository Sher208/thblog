import { notFound } from "next/navigation";
import { PostList } from "@/components/post-list";
import { listPublicPostsByTag } from "@/lib/posts";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ tag: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { tag: tagSlug } = await params;
  const result = await listPublicPostsByTag(tagSlug);
  if (!result) return { title: "Not found" };
  return { title: result.tag.name };
}

export default async function TagPage({ params }: Props) {
  const { tag: tagSlug } = await params;
  const result = await listPublicPostsByTag(tagSlug);
  if (!result) notFound();

  return (
    <div className="animate-fade-up">
      <header className="border-b border-border/70 pb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {result.tag.name}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {result.posts.length} public{" "}
          {result.posts.length === 1 ? "post" : "posts"}
        </p>
      </header>
      <div className="mt-2">
        <PostList
          posts={result.posts}
          emptyLabel="No public posts in this topic."
        />
      </div>
    </div>
  );
}
