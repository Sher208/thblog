import { PostList } from "@/components/post-list";
import { listPublicPosts, listPublicTags } from "@/lib/posts";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
        <nav aria-label="Browse by topic" className="animate-fade-up mb-8">
          <p className="mb-3 text-sm text-muted-foreground">Browse by topic</p>
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.id}>
                <Badge
                  variant="outline"
                  render={<Link href={`/tags/${tag.slug}`} />}
                  className="no-underline"
                >
                  {tag.name}
                </Badge>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <PostList posts={posts} />
    </div>
  );
}
