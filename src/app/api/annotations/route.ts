import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { annotations, posts } from "@/lib/db/schema";
import { createId } from "@/lib/id";
import type { Annotation } from "@/lib/annotations/types";
import { DEFAULT_ANNOTATION_COLOR } from "@/lib/annotations/types";

async function requireSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

function toClient(row: typeof annotations.$inferSelect): Annotation {
  return {
    id: row.id,
    postId: row.postId,
    kind: row.kind,
    body: row.body,
    quote: row.quote,
    prefix: row.prefix,
    suffix: row.suffix,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
    color: row.color,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.getTime()
        : Number(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.getTime()
        : Number(row.updatedAt),
  };
}

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(annotations)
    .where(
      and(
        eq(annotations.userId, session.user.id),
        eq(annotations.postId, postId),
      ),
    );

  return NextResponse.json({ annotations: rows.map(toClient) });
}

export async function POST(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      postId?: string;
      kind?: "highlight" | "note";
      body?: string;
      quote?: string;
      prefix?: string;
      suffix?: string;
      startOffset?: number;
      endOffset?: number;
      color?: string;
    };

    if (!body.postId || !body.kind || !body.quote?.trim()) {
      return NextResponse.json(
        { error: "postId, kind, and quote are required" },
        { status: 400 },
      );
    }
    if (body.kind !== "highlight" && body.kind !== "note") {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }

    const post = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, body.postId))
      .limit(1);
    if (!post.length) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const startOffset = Number(body.startOffset ?? 0);
    const endOffset = Number(body.endOffset ?? 0);
    if (
      !Number.isFinite(startOffset) ||
      !Number.isFinite(endOffset) ||
      endOffset < startOffset
    ) {
      return NextResponse.json(
        { error: "Invalid offsets" },
        { status: 400 },
      );
    }

    const id = createId("ann");
    const now = new Date();
    const [row] = await db
      .insert(annotations)
      .values({
        id,
        userId: session.user.id,
        postId: body.postId,
        kind: body.kind,
        body: body.body ?? "",
        quote: body.quote,
        prefix: body.prefix ?? "",
        suffix: body.suffix ?? "",
        startOffset,
        endOffset,
        color: body.color ?? DEFAULT_ANNOTATION_COLOR,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!row) {
      return NextResponse.json(
        { error: "Failed to create annotation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ annotation: toClient(row) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      body?: string;
      color?: string;
      kind?: "highlight" | "note";
    };

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(annotations)
      .where(
        and(
          eq(annotations.id, body.id),
          eq(annotations.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updates: Partial<typeof annotations.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.body !== undefined) updates.body = body.body;
    if (body.color !== undefined) updates.color = body.color;
    if (body.kind === "highlight" || body.kind === "note") {
      updates.kind = body.kind;
    }

    const [row] = await db
      .update(annotations)
      .set(updates)
      .where(
        and(
          eq(annotations.id, body.id),
          eq(annotations.userId, session.user.id),
        ),
      )
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ annotation: toClient(row) });
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

  const deleted = await db
    .delete(annotations)
    .where(
      and(eq(annotations.id, id), eq(annotations.userId, session.user.id)),
    )
    .returning({ id: annotations.id });

  if (!deleted.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
