import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchPosts } from "@/lib/posts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const results = await searchPosts(q, {
    includePrivate: Boolean(session),
    limit: 12,
  });

  return NextResponse.json({ results });
}
