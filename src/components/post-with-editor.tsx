"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Columns2, Copy } from "lucide-react";
import { ReadingProgress } from "@/components/reading-progress";
import { TableOfContents } from "@/components/table-of-contents";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import type { Visibility } from "@/lib/db/schema";
import type { TocItem } from "@/lib/markdown";
import { renderMarkdownPreview } from "@/lib/markdown-preview";
import { serializePostToMarkdown } from "@/lib/serialize-post-markdown";
import { cn } from "@/lib/utils";

export type EditablePost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  bodyHtml: string;
  visibility: Visibility;
  publishedLabel: string;
  publishedDateTime?: string;
  tags: { id: string; name: string; slug: string }[];
  toc: TocItem[];
};

type Draft = {
  title: string;
  slug: string;
  excerpt: string;
  tags: string;
  visibility: Visibility;
  bodyMd: string;
};

type PreviewTab = "write" | "preview";

const AUTOSAVE_MS = 60 * 1000;
const PREVIEW_DEBOUNCE_MS = 120;

function draftFromPost(post: EditablePost): Draft {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    tags: post.tags.map((t) => t.name).join(", "),
    visibility: post.visibility,
    bodyMd: post.bodyMd,
  };
}

function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function draftsEqual(a: Draft, b: Draft): boolean {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.excerpt === b.excerpt &&
    a.tags === b.tags &&
    a.visibility === b.visibility &&
    a.bodyMd === b.bodyMd
  );
}

const fieldClass =
  "w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm outline-none ring-accent focus:ring-2";

export function PostWithEditor({
  post,
  canEdit,
}: {
  post: EditablePost;
  canEdit: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState(
    () => canEdit && searchParams.get("edit") === "1",
  );
  const [draft, setDraft] = useState<Draft>(() => draftFromPost(post));
  const [previewHtml, setPreviewHtml] = useState(post.bodyHtml);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<PreviewTab>("write");

  const draftRef = useRef(draft);
  const lastSavedRef = useRef(draftFromPost(post));
  const savingRef = useRef(false);
  const previewRequestId = useRef(0);
  const postIdRef = useRef(post.id);

  draftRef.current = draft;
  postIdRef.current = post.id;

  useEffect(() => {
    if (canEdit && searchParams.get("edit") === "1") {
      setEditing(true);
    }
  }, [canEdit, searchParams]);

  useEffect(() => {
    if (!editing) {
      const next = draftFromPost(post);
      setDraft(next);
      lastSavedRef.current = next;
      setPreviewHtml(post.bodyHtml);
      setDirty(false);
    }
  }, [post, editing]);

  useEffect(() => {
    setDirty(!draftsEqual(draft, lastSavedRef.current));
  }, [draft]);

  function setEditQuery(enabled: boolean, slug = post.slug) {
    const params = new URLSearchParams(searchParams.toString());
    if (enabled) params.set("edit", "1");
    else params.delete("edit");
    const query = params.toString();
    router.replace(`/blog/${slug}${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  }

  useEffect(() => {
    if (!editing) return;

    const handle = window.setTimeout(() => {
      const requestId = ++previewRequestId.current;
      void renderMarkdownPreview(draft.bodyMd).then((html) => {
        if (requestId === previewRequestId.current) {
          setPreviewHtml(html);
        }
      });
    }, PREVIEW_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [draft.bodyMd, editing]);

  const saveEdit = useCallback(
    async (options?: { autosave?: boolean }) => {
      const autosave = options?.autosave ?? false;
      const current = draftRef.current;

      if (!current.title.trim() || !current.slug.trim()) {
        if (!autosave) {
          toast.add({
            title: "Title and slug are required",
            type: "error",
          });
        }
        return false;
      }

      if (autosave && draftsEqual(current, lastSavedRef.current)) {
        return true;
      }

      if (savingRef.current) return false;

      savingRef.current = true;
      setSaving(true);

      const nextSlug = current.slug.trim();
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: postIdRef.current,
          title: current.title.trim(),
          slug: nextSlug,
          excerpt: current.excerpt,
          visibility: current.visibility,
          tags: parseTagsInput(current.tags),
          bodyMd: current.bodyMd,
        }),
      });

      savingRef.current = false;
      setSaving(false);

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.add({
          title: data?.error || "Could not save post",
          type: "error",
        });
        return false;
      }

      lastSavedRef.current = {
        ...current,
        title: current.title.trim(),
        slug: nextSlug,
      };
      setDirty(false);

      if (autosave) {
        toast.add({ title: "Autosaved", type: "success" });
        if (nextSlug !== post.slug) {
          setEditQuery(true, nextSlug);
        }
        router.refresh();
        return true;
      }

      toast.add({ title: "Saved", type: "success" });
      setEditing(false);

      if (nextSlug !== post.slug) {
        router.replace(`/blog/${nextSlug}`);
        router.refresh();
        return true;
      }

      setEditQuery(false, nextSlug);
      router.refresh();
      return true;
    },
    // setEditQuery uses searchParams/post.slug/router; keep deps minimal via refs where needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post.slug, router, searchParams],
  );

  useEffect(() => {
    if (!editing) return;

    const timer = window.setInterval(() => {
      if (!draftsEqual(draftRef.current, lastSavedRef.current)) {
        void saveEdit({ autosave: true });
      }
    }, AUTOSAVE_MS);

    return () => window.clearInterval(timer);
  }, [editing, saveEdit]);

  function startEdit() {
    const next = draftFromPost(post);
    setDraft(next);
    lastSavedRef.current = next;
    setPreviewHtml(post.bodyHtml);
    setDirty(false);
    setMobileTab("write");
    setEditing(true);
    setEditQuery(true);
  }

  function cancelEdit() {
    setEditing(false);
    const next = draftFromPost(post);
    setDraft(next);
    lastSavedRef.current = next;
    setPreviewHtml(post.bodyHtml);
    setDirty(false);
    setEditQuery(false);
  }

  async function copyMarkdown() {
    const source = serializePostToMarkdown({
      title: draft.title.trim() || post.title,
      slug: draft.slug.trim() || post.slug,
      excerpt: draft.excerpt,
      visibility: draft.visibility,
      tags: parseTagsInput(draft.tags),
      bodyMd: draft.bodyMd,
    });

    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      toast.add({ title: "Copied Markdown", type: "success" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({ title: "Could not copy to clipboard", type: "error" });
    }
  }

  if (editing && canEdit) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-12 z-50 flex flex-col border-t border-border bg-background">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
          <p className="mr-auto font-[family-name:var(--font-display)] text-base tracking-tight">
            Edit post
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {saving
                ? "Saving…"
                : dirty
                  ? "Unsaved changes · autosaves every minute"
                  : "Up to date"}
            </span>
          </p>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={copied ? "Copied Markdown" : "Copy Markdown"}
                  onClick={() => void copyMarkdown()}
                />
              }
            >
              {copied ? (
                <Check className="size-4 text-primary" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {copied ? "Copied" : "Copy MD"}
            </TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void saveEdit()}
            className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="shrink-0 space-y-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs text-muted-foreground">
              Title
              <input
                type="text"
                value={draft.title}
                onChange={(e) =>
                  setDraft({ ...draft, title: e.target.value })
                }
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Slug
              <input
                type="text"
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Tags
              <input
                type="text"
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                placeholder="arrays, dp"
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Visibility
              <select
                value={draft.visibility}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    visibility: e.target.value as Visibility,
                  })
                }
                className={`${fieldClass} mt-1`}
              >
                <option value="private">private</option>
                <option value="public">public</option>
              </select>
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">
            Excerpt
            <input
              type="text"
              value={draft.excerpt}
              onChange={(e) =>
                setDraft({ ...draft, excerpt: e.target.value })
              }
              className={`${fieldClass} mt-1`}
            />
          </label>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-border px-4 py-2 md:hidden sm:px-5">
          <button
            type="button"
            onClick={() => setMobileTab("write")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition",
              mobileTab === "write"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition",
              mobileTab === "preview"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Preview
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
          <div
            className={cn(
              "min-h-0 border-border md:border-r",
              mobileTab === "preview" ? "hidden md:block" : "flex md:block",
            )}
          >
            <textarea
              value={draft.bodyMd}
              onChange={(e) =>
                setDraft({ ...draft, bodyMd: e.target.value })
              }
              spellCheck={false}
              aria-label="Markdown body"
              className="h-full min-h-[50dvh] w-full resize-none bg-code-bg/40 px-4 py-4 font-mono text-[13px] leading-relaxed outline-none sm:px-5 md:min-h-0"
            />
          </div>
          <div
            className={cn(
              "min-h-0 overflow-y-auto px-4 py-4 sm:px-5",
              mobileTab === "write" ? "hidden md:block" : "block",
            )}
          >
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
              {draft.title.trim() || "Untitled"}
            </h2>
            {draft.excerpt.trim() ? (
              <p className="mb-6 text-muted-foreground">{draft.excerpt}</p>
            ) : null}
            <div
              className="prose-blog"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <article id="post-article" className="animate-fade-up pb-16">
      <ReadingProgress />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 text-muted-foreground no-underline",
          )}
        >
          <ArrowLeft data-icon="inline-start" />
          All posts
        </Link>
        {canEdit ? (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={copied ? "Copied Markdown" : "Copy Markdown"}
                    onClick={() => void copyMarkdown()}
                  />
                }
              >
                {copied ? (
                  <Check className="size-4 text-primary" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {copied ? "Copied" : "Copy MD"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit side by side"
                    onClick={startEdit}
                  />
                }
              >
                <Columns2 className="size-4" aria-hidden />
              </TooltipTrigger>
              <TooltipContent side="bottom">Edit side by side</TooltipContent>
            </Tooltip>
          </div>
        ) : null}
      </div>

      {post.visibility === "private" ? (
        <Badge variant="secondary" className="mb-4">
          Private
        </Badge>
      ) : null}

      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          {post.publishedLabel ? (
            <time dateTime={post.publishedDateTime}>{post.publishedLabel}</time>
          ) : null}
          {post.tags.length ? (
            <ul className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li key={tag.id}>
                  <Badge
                    variant="outline"
                    render={<Link href={`/tags/${tag.slug}`} />}
                    className="no-underline"
                  >
                    {tag.name}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {post.excerpt ? (
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}
      </header>

      <Separator className="mb-10" />

      <TableOfContents items={post.toc} />

      <div
        className="prose-blog"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />
    </article>
  );
}
