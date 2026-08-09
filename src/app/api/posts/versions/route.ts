import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPostById,
  getPostVersion,
  listPostVersions,
  restorePostVersion,
} from "@/lib/posts";

async function requireSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postId = new URL(request.url).searchParams.get("postId");
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const post = await getPostById(postId);
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const versions = await listPostVersions(postId);
  return NextResponse.json({ versions });
}

export async function POST(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    postId?: string;
    versionId?: string;
  };

  if (!body.postId || !body.versionId) {
    return NextResponse.json(
      { error: "postId and versionId are required" },
      { status: 400 },
    );
  }

  const version = await getPostVersion(body.versionId);
  if (!version || version.postId !== body.postId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const post = await restorePostVersion(body.postId, body.versionId);
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const versions = await listPostVersions(body.postId);
    return NextResponse.json({ post, versions });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restore failed" },
      { status: 500 },
    );
  }
}
