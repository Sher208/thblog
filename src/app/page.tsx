import { PostList } from "@/components/post-list";
import { listPublicPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const posts = await listPublicPosts();

  return (
    <div>
      <h1 className="sr-only">Latest posts</h1>
      <PostList posts={posts} />
    </div>
  );
}
