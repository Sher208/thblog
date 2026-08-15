import type { MetadataRoute } from "next";
import {
  listPublicPosts,
  listPublicSeries,
  listPublicTags,
} from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const [posts, tags, series] = await Promise.all([
    listPublicPosts(),
    listPublicTags(),
    listPublicSeries(),
  ]);

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/tags`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${base}/series`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...tags.map((tag) => ({
      url: `${base}/tags/${tag.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...series.map((item) => ({
      url: `${base}/series/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.55,
    })),
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
