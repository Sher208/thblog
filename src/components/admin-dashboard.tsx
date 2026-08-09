"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { Visibility } from "@/lib/db/schema";

type AdminPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  visibility: Visibility;
  updatedAt: string;
  tags: { id: string; name: string; slug: string }[];
};

export function AdminDashboard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/posts");
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (!res.ok) {
      setError("Failed to load posts");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { posts: AdminPost[] };
    setPosts(
      data.posts.map((post) => ({
        ...post,
        updatedAt:
          typeof post.updatedAt === "string"
            ? post.updatedAt
            : new Date(post.updatedAt).toISOString(),
      })),
    );
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function uploadFile(file: File) {
    setUploading(true);
    setMessage(null);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/posts", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error || "Upload failed");
      return;
    }
    const data = (await res.json()) as { post: AdminPost };
    setMessage(`Saved “${data.post.title}” (${data.post.visibility})`);
    await loadPosts();
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    await uploadFile(files[0]);
  }

  async function toggleVisibility(post: AdminPost) {
    const visibility: Visibility =
      post.visibility === "public" ? "private" : "public";
    const res = await fetch("/api/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, visibility }),
    });
    if (!res.ok) {
      setError("Could not update visibility");
      return;
    }
    await loadPosts();
  }

  async function removePost(post: AdminPost) {
    if (!confirm(`Delete “${post.title}”?`)) return;
    const res = await fetch(`/api/posts?id=${encodeURIComponent(post.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Could not delete post");
      return;
    }
    await loadPosts();
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="animate-fade-up pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Admin
          </h1>
          <p className="mt-1 text-sm text-muted">
            Upload Markdown, convert to posts, toggle public / private.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          Sign out
        </button>
      </div>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void onFiles(e.dataTransfer.files);
        }}
        className={`mt-8 rounded-2xl border border-dashed px-5 py-10 text-center transition ${
          dragOver
            ? "border-accent bg-accent-soft"
            : "border-border bg-background-elevated/60"
        }`}
      >
        <p className="font-[family-name:var(--font-display)] text-xl">
          Drop a .md file
        </p>
        <p className="mt-2 text-sm text-muted">
          Frontmatter title, slug, tags, excerpt, and visibility are read
          automatically.
        </p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Choose file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.mdx,text/markdown"
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
      </section>

      {message ? (
        <p className="mt-4 text-sm text-accent">{message}</p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <section className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          All posts
        </h2>
        {loading ? (
          <p className="mt-4 text-muted">Loading…</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {posts.map((post) => (
              <li
                key={post.id}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="truncate font-[family-name:var(--font-display)] text-lg hover:text-accent"
                    >
                      {post.title}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                        post.visibility === "public"
                          ? "bg-accent-soft text-accent"
                          : "bg-code-bg text-muted"
                      }`}
                    >
                      {post.visibility}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">
                    /blog/{post.slug}
                    {post.tags.length
                      ? ` · ${post.tags.map((t) => t.name).join(", ")}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleVisibility(post)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-accent"
                  >
                    Make {post.visibility === "public" ? "private" : "public"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removePost(post)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && !posts.length ? (
          <p className="mt-4 text-muted">No posts yet — upload a Markdown file.</p>
        ) : null}
      </section>
    </div>
  );
}
