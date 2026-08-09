import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createPostFromMarkdown,
  listAllPosts,
  updatePostMeta,
  updatePostVisibility,
  deletePost,
  getPostById,
} from "@/lib/posts";
import type { Visibility } from "@/lib/db/schema";

async function requireSession(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session) {
    return null;
  }
  return session;
}

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await listAllPosts();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Markdown file is required" },
          { status: 400 },
        );
      }
      if (!file.name.match(/\.mdx?$/i)) {
        return NextResponse.json(
          { error: "Only .md or .mdx files are accepted" },
          { status: 400 },
        );
      }
      const raw = await file.text();
      const post = await createPostFromMarkdown(raw, file.name);
      return NextResponse.json({ post }, { status: 201 });
    }

    const body = (await request.json()) as {
      markdown?: string;
      filename?: string;
    };
    if (!body.markdown?.trim()) {
      return NextResponse.json(
        { error: "markdown is required" },
        { status: 400 },
      );
    }
    const post = await createPostFromMarkdown(body.markdown, body.filename);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    visibility?: Visibility;
    title?: string;
    slug?: string;
    excerpt?: string;
    tags?: string[];
    bodyMd?: string;
    version?: "manual" | "draft" | null;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    if (
      body.visibility &&
      body.title === undefined &&
      body.slug === undefined &&
      body.excerpt === undefined &&
      body.tags === undefined &&
      body.bodyMd === undefined
    ) {
      const post = await updatePostVisibility(body.id, body.visibility);
      if (!post) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ post });
    }

    const post = await updatePostMeta(
      body.id,
      {
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        visibility: body.visibility,
        tags: body.tags,
        bodyMd: body.bodyMd,
      },
      { version: body.version ?? "manual" },
    );
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await getPostById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deletePost(id);
  return NextResponse.json({ ok: true });
}
