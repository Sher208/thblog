import { PostList } from "@/components/post-list";
import { listPublicPosts, listPublicTags } from "@/lib/posts";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [posts, tags] = await Promise.all([
    listPublicPosts(),
    listPublicTags(),
  ]);

  return (
    <div>
      <section className="animate-fade-up pb-10">
        <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
          thblog
        </p>
        <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
          A personal blog for writing, notes, and ideas.
        </p>
      </section>

      {tags.length ? (
        <div className="animate-fade-up stagger-1 mb-8 flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-6 text-sm">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className="text-muted transition hover:text-accent"
            >
              {tag.name}
              <span className="ml-1 text-xs opacity-60">{tag.count}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <PostList posts={posts} />
    </div>
  );
}
