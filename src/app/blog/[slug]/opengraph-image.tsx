import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/posts";
import { estimateReadingMinutes } from "@/lib/reading-time";

export const runtime = "nodejs";
export const alt = "thblog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const isPublic = post?.visibility === "public";

  const title = isPublic ? post.title : "thblog";
  const excerpt = isPublic
    ? post.excerpt || "A fast, mobile-first personal blog."
    : "A fast, mobile-first personal blog.";
  const readingMinutes = isPublic
    ? estimateReadingMinutes(post.bodyMd)
    : null;
  const seriesTitle = isPublic ? (post.series?.title ?? null) : null;
  const tags = isPublic
    ? post.tags.slice(0, 3).map((tag) => tag.name)
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "#0c1016",
          backgroundImage:
            "radial-gradient(900px 420px at 0% 0%, rgba(91, 196, 182, 0.22), transparent 55%), radial-gradient(700px 380px at 100% 100%, rgba(45, 74, 120, 0.28), transparent 50%)",
          color: "#e8edf3",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 28,
            color: "#5bc4b6",
            letterSpacing: "-0.02em",
          }}
        >
          <span>thblog</span>
          {readingMinutes ? (
            <span style={{ color: "#9aa8b7", fontSize: 24 }}>
              {readingMinutes} min read
            </span>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {seriesTitle ? (
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#9aa8b7",
              }}
            >
              {seriesTitle}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: title.length > 60 ? 52 : 64,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              fontWeight: 600,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              lineHeight: 1.35,
              color: "#9aa8b7",
              maxWidth: 920,
            }}
          >
            {excerpt.length > 140 ? `${excerpt.slice(0, 137)}…` : excerpt}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 22,
            color: "#5bc4b6",
          }}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                border: "1px solid #2c3643",
                borderRadius: 999,
                padding: "8px 16px",
                background: "rgba(20, 52, 48, 0.55)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
