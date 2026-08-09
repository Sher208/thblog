"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { Visibility } from "@/lib/db/schema";
import { toast } from "@/components/ui/toast";

type AdminPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  visibility: Visibility;
  updatedAt: string;
  tags: { id: string; name: string; slug: string }[];
};

type ImportMode = "file" | "paste";

export function AdminDashboard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("file");
  const [pasteMarkdown, setPasteMarkdown] = useState("");
  const [pasteFilename, setPasteFilename] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/posts");
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (!res.ok) {
      toast.add({ title: "Failed to load posts", type: "error" });
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

  async function handleCreateResponse(res: Response) {
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.add({ title: data?.error || "Upload failed", type: "error" });
      return false;
    }
    const data = (await res.json()) as { post: AdminPost };
    toast.add({
      title: `Saved “${data.post.title}”`,
      description: data.post.visibility,
      type: "success",
    });
    await loadPosts();
    return true;
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/posts", { method: "POST", body: form });
    setUploading(false);
    await handleCreateResponse(res);
  }

  async function submitPaste() {
    const markdown = pasteMarkdown.trim();
    if (!markdown) {
      toast.add({ title: "Paste some Markdown first", type: "error" });
      return;
    }
    setUploading(true);
    const filename = pasteFilename.trim()
      ? pasteFilename.trim().replace(/\.mdx?$/i, "") + ".md"
      : undefined;
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown, filename }),
    });
    setUploading(false);
    const ok = await handleCreateResponse(res);
    if (ok) {
      setPasteMarkdown("");
      setPasteFilename("");
    }
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
      toast.add({ title: "Could not update visibility", type: "error" });
      return;
    }
    toast.add({
      title: `Made “${post.title}” ${visibility}`,
      type: "success",
    });
    await loadPosts();
  }

  async function removePost(post: AdminPost) {
    if (!confirm(`Delete “${post.title}”?`)) return;
    const res = await fetch(`/api/posts?id=${encodeURIComponent(post.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.add({ title: "Could not delete post", type: "error" });
      return;
    }
    toast.add({ title: `Deleted “${post.title}”`, type: "success" });
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
          <p className="mt-1 text-sm text-muted-foreground">
            Upload or paste Markdown, convert to posts, toggle public / private.
            Open a post to edit side by side.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Sign out
        </button>
      </div>

      <div className="mt-8 flex gap-1 rounded-lg border border-border bg-background-elevated/60 p-1 w-fit">
        {(
          [
            { id: "file", label: "Upload file" },
            { id: "paste", label: "Paste Markdown" },
          ] as const
        ).map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setImportMode(mode.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              importMode === mode.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {importMode === "file" ? (
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
          className={`mt-4 rounded-2xl border border-dashed px-5 py-10 text-center transition ${
            dragOver
              ? "border-primary bg-accent-soft"
              : "border-border bg-background-elevated/60"
          }`}
        >
          <p className="font-[family-name:var(--font-display)] text-xl">
            Drop a .md file
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
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
      ) : (
        <section className="mt-4 rounded-2xl border border-border bg-background-elevated/60 px-5 py-6">
          <p className="font-[family-name:var(--font-display)] text-xl">
            Paste Markdown
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Include YAML frontmatter for title, slug, tags, excerpt, and
            visibility. Filename is optional and used as a slug fallback.
          </p>
          <label className="mt-5 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Filename (optional)
            <input
              type="text"
              value={pasteFilename}
              onChange={(e) => setPasteFilename(e.target.value)}
              placeholder="my-post.md"
              disabled={uploading}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground placeholder:text-muted-foreground disabled:opacity-60"
            />
          </label>
          <label className="mt-4 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Markdown
            <textarea
              value={pasteMarkdown}
              onChange={(e) => setPasteMarkdown(e.target.value)}
              placeholder={`---\ntitle: Hello\nslug: hello\nvisibility: private\ntags: [notes]\n---\n\nYour content here.`}
              rows={14}
              disabled={uploading}
              spellCheck={false}
              className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm font-normal normal-case tracking-normal text-foreground placeholder:text-muted-foreground disabled:opacity-60"
            />
          </label>
          <button
            type="button"
            disabled={uploading || !pasteMarkdown.trim()}
            onClick={() => void submitPaste()}
            className="mt-5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {uploading ? "Creating…" : "Create post"}
          </button>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          All posts
        </h2>
        {loading ? (
          <p className="mt-4 text-muted-foreground">Loading…</p>
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
                      href={`/blog/${post.slug}?edit=1`}
                      className="truncate font-[family-name:var(--font-display)] text-lg hover:text-primary"
                    >
                      {post.title}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                        post.visibility === "public"
                          ? "bg-accent-soft text-primary"
                          : "bg-code-bg text-muted-foreground"
                      }`}
                    >
                      {post.visibility}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
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
                    className="rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-primary"
                  >
                    Make {post.visibility === "public" ? "private" : "public"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removePost(post)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && !posts.length ? (
          <p className="mt-4 text-muted-foreground">
            No posts yet — upload or paste Markdown.
          </p>
        ) : null}
      </section>
    </div>
  );
}
