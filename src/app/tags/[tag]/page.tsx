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
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
        {result.tag.name}
      </h1>
      <p className="mt-2 text-muted">
        {result.posts.length} public{" "}
        {result.posts.length === 1 ? "post" : "posts"}
      </p>
      <div className="mt-8">
        <PostList posts={result.posts} emptyLabel="No public posts in this topic." />
      </div>
    </div>
  );
}
