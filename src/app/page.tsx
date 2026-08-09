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
      <h1 className="sr-only">Latest posts</h1>

      {tags.length ? (
        <nav
          aria-label="Browse by topic"
          className="animate-fade-up mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-2 text-sm"
        >
          <p className="shrink-0 text-muted">Browse by topic</p>
          <ul className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
            {tags.map((tag, index) => (
              <li key={tag.id} className="flex items-baseline gap-x-1">
                {index > 0 ? (
                  <span className="text-border" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link
                  href={`/tags/${tag.slug}`}
                  className="text-foreground no-underline transition hover:text-accent"
                >
                  {tag.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <PostList posts={posts} />
    </div>
  );
}
