import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "thblog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "#0c1016",
          backgroundImage:
            "radial-gradient(900px 420px at 8% 0%, rgba(91, 196, 182, 0.24), transparent 55%), radial-gradient(700px 380px at 100% 100%, rgba(45, 74, 120, 0.28), transparent 50%)",
          color: "#e8edf3",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: "#5bc4b6",
            letterSpacing: "-0.02em",
            marginBottom: 24,
          }}
        >
          Personal notes
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          thblog
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 32,
            color: "#9aa8b7",
            maxWidth: 780,
            lineHeight: 1.35,
          }}
        >
          A fast, mobile-first blog for patterns, drafts, and deep notes.
        </div>
      </div>
    ),
    { ...size },
  );
}
