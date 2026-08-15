"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, Check, Columns2, Copy, History } from "lucide-react";
import { EditorOutline } from "@/components/editor-outline";
import { RelatedPosts, SeriesNav } from "@/components/post-relations";
import { ReadingProgress } from "@/components/reading-progress";
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
import type { PostWithTags } from "@/lib/posts";
import {
  clearSectionBookmark,
  getSectionBookmark,
  setSectionBookmark,
} from "@/lib/section-bookmark";
import { extractTocFromMarkdown, type TocItem } from "@/lib/toc";
import { renderMarkdownPreview } from "@/lib/markdown-preview";
import { serializePostToMarkdown } from "@/lib/serialize-post-markdown";
import { ProseContent } from "@/components/prose-content";
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
  readingLabel: string;
  series: {
    slug: string;
    title: string;
    order: number | null;
  } | null;
  tags: { id: string; name: string; slug: string }[];
  toc: TocItem[];
};

type Draft = {
  title: string;
  slug: string;
  excerpt: string;
  tags: string;
  visibility: Visibility;
  seriesSlug: string;
  seriesTitle: string;
  seriesOrder: string;
  bodyMd: string;
};

type PreviewTab = "write" | "preview" | "index";

type PostVersionItem = {
  id: string;
  kind: "manual" | "draft";
  title: string;
  slug: string;
  excerpt: string;
  bodyMd: string;
  visibility: Visibility;
  tags: string[];
  createdAt: string;
};

const AUTOSAVE_MS = 60 * 1000;
const PREVIEW_DEBOUNCE_MS = 280;

/** Scroll one pane to match another by percentage (avoids feedback loops via lock). */
function syncScrollByRatio(
  source: HTMLElement,
  target: HTMLElement,
  lock: { current: boolean },
) {
  if (lock.current) return;
  const sourceMax = source.scrollHeight - source.clientHeight;
  const targetMax = target.scrollHeight - target.clientHeight;
  if (sourceMax <= 0 || targetMax <= 0) return;

  lock.current = true;
  target.scrollTop = (source.scrollTop / sourceMax) * targetMax;
  requestAnimationFrame(() => {
    lock.current = false;
  });
}

/** Find the source line for a preview heading (matches `#` / `##` / `###` text). */
function findHeadingLineIndex(bodyMd: string, headingText: string): number {
  const lines = bodyMd.split("\n");
  const needle = headingText.trim().toLowerCase();
  if (!needle) return -1;

  for (let i = 0; i < lines.length; i++) {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(lines[i] ?? "");
    if (!match) continue;
    if ((match[2] ?? "").trim().toLowerCase() === needle) return i;
  }
  return -1;
}

function scrollTextareaToLine(
  textarea: HTMLTextAreaElement,
  lineIndex: number,
) {
  const lines = textarea.value.split("\n");
  const safeIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));
  let start = 0;
  for (let i = 0; i < safeIndex; i++) {
    start += (lines[i]?.length ?? 0) + 1;
  }
  const line = lines[safeIndex] ?? "";
  const end = start + line.length;

  textarea.focus();
  textarea.setSelectionRange(start, end);

  const styles = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 20;
  const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
  const targetTop = paddingTop + safeIndex * lineHeight;
  textarea.scrollTop = Math.max(
    0,
    targetTop - textarea.clientHeight / 3,
  );
}

function draftFromPost(post: EditablePost): Draft {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    tags: post.tags.map((t) => t.name).join(", "),
    visibility: post.visibility,
    seriesSlug: post.series?.slug ?? "",
    seriesTitle: post.series?.title ?? "",
    seriesOrder:
      post.series?.order != null ? String(post.series.order) : "",
    bodyMd: post.bodyMd,
  };
}

function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseSeriesOrder(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function draftsEqual(a: Draft, b: Draft): boolean {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.excerpt === b.excerpt &&
    a.tags === b.tags &&
    a.visibility === b.visibility &&
    a.seriesSlug === b.seriesSlug &&
    a.seriesTitle === b.seriesTitle &&
    a.seriesOrder === b.seriesOrder &&
    a.bodyMd === b.bodyMd
  );
}

function formatVersionTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const fieldClass =
  "w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm outline-none ring-accent focus:ring-2";

export function PostWithEditor({
  post,
  canEdit,
  seriesNav,
  relatedPosts,
}: {
  post: EditablePost;
  canEdit: boolean;
  seriesNav?: {
    previous: Pick<PostWithTags, "slug" | "title"> | null;
    next: Pick<PostWithTags, "slug" | "title"> | null;
    index: number;
    total: number;
  } | null;
  relatedPosts?: PostWithTags[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState(
    () => canEdit && searchParams.get("edit") === "1",
  );
  const [draft, setDraft] = useState<Draft>(() => draftFromPost(post));
  const [previewHtml, setPreviewHtml] = useState(post.bodyHtml);
  const [outline, setOutline] = useState<TocItem[]>(() =>
    extractTocFromMarkdown(post.bodyMd),
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<PreviewTab>("write");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<PostVersionItem[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [restoring, setRestoring] = useState(false);
  const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null);
  const [bookmarkedHeadingId, setBookmarkedHeadingId] = useState<string | null>(
    null,
  );

  const draftRef = useRef(draft);
  const lastSavedRef = useRef(draftFromPost(post));
  const savingRef = useRef(false);
  const previewRequestId = useRef(0);
  const postIdRef = useRef(post.id);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const scrollSyncLock = useRef(false);
  const scrollRafId = useRef(0);

  draftRef.current = draft;
  postIdRef.current = post.id;

  function bindPreviewEl(el: HTMLDivElement | null) {
    previewRef.current = el;
    setPreviewEl(el);
  }

  function handleEditorScroll() {
    if (scrollRafId.current || historyOpen) return;
    scrollRafId.current = requestAnimationFrame(() => {
      scrollRafId.current = 0;
      const editor = editorRef.current;
      const preview = previewRef.current;
      if (!editor || !preview) return;
      syncScrollByRatio(editor, preview, scrollSyncLock);
    });
  }

  function handlePreviewScroll() {
    if (scrollRafId.current || historyOpen) return;
    scrollRafId.current = requestAnimationFrame(() => {
      scrollRafId.current = 0;
      const editor = editorRef.current;
      const preview = previewRef.current;
      if (!editor || !preview) return;
      syncScrollByRatio(preview, editor, scrollSyncLock);
    });
  }

  function jumpToOutlineItem(item: TocItem) {
    const preview = previewRef.current;
    const editor = editorRef.current;

    if (preview) {
      const heading = preview.querySelector<HTMLElement>(
        `#${CSS.escape(item.id)}`,
      );
      if (heading) {
        scrollSyncLock.current = true;
        preview.scrollTop = Math.max(0, heading.offsetTop - 16);
        requestAnimationFrame(() => {
          scrollSyncLock.current = false;
        });
      }
    }

    if (editor) {
      const lineIndex = findHeadingLineIndex(draftRef.current.bodyMd, item.text);
      if (lineIndex >= 0) {
        scrollTextareaToLine(editor, lineIndex);
      }
    }

    if (mobileTab === "index") {
      setMobileTab("preview");
    }
  }

  function handlePreviewClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    const heading = target?.closest?.("h1, h2, h3, h4, h5, h6");
    if (!heading || !previewRef.current?.contains(heading)) return;

    const lineIndex = findHeadingLineIndex(
      draftRef.current.bodyMd,
      heading.textContent ?? "",
    );
    if (lineIndex < 0) return;

    event.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;

    if (mobileTab !== "write") {
      setMobileTab("write");
      requestAnimationFrame(() => scrollTextareaToLine(editor, lineIndex));
      return;
    }

    scrollTextareaToLine(editor, lineIndex);
  }

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
      const nextOutline = extractTocFromMarkdown(post.bodyMd);
      setOutline(nextOutline);
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
      const nextOutline = extractTocFromMarkdown(draft.bodyMd);
      setOutline(nextOutline);
      void renderMarkdownPreview(draft.bodyMd).then((html) => {
        if (requestId === previewRequestId.current) {
          setPreviewHtml(html);
        }
      });
    }, PREVIEW_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [draft.bodyMd, editing]);

  function jumpToReadHeading(item: TocItem, behavior: ScrollBehavior = "smooth") {
    const heading = document.getElementById(item.id);
    if (!heading) return;
    const top = window.scrollY + heading.getBoundingClientRect().top - 80;
    window.scrollTo({ top: Math.max(0, top), behavior });
    window.history.replaceState(null, "", `#${item.id}`);
  }

  function toggleSectionBookmark(item: TocItem) {
    if (bookmarkedHeadingId === item.id) {
      clearSectionBookmark(post.slug);
      setBookmarkedHeadingId(null);
      return;
    }
    setSectionBookmark(post.slug, item.id);
    setBookmarkedHeadingId(item.id);
  }

  function jumpToBookmark() {
    if (!bookmarkedHeadingId) return;
    jumpToReadHeading({ id: bookmarkedHeadingId, text: "", level: 1 });
  }

  useEffect(() => {
    if (editing) return;
    setBookmarkedHeadingId(getSectionBookmark(post.slug));
  }, [editing, post.slug]);

  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const res = await fetch(
        `/api/posts/versions?postId=${encodeURIComponent(postIdRef.current)}`,
      );
      if (!res.ok) {
        toast.add({ title: "Could not load versions", type: "error" });
        return;
      }
      const data = (await res.json()) as { versions: PostVersionItem[] };
      const next = data.versions.map((version) => ({
        ...version,
        createdAt:
          typeof version.createdAt === "string"
            ? version.createdAt
            : new Date(version.createdAt).toISOString(),
      }));
      setVersions(next);
      setSelectedVersionId((current) => {
        if (current && next.some((version) => version.id === current)) {
          return current;
        }
        return next[0]?.id ?? null;
      });
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (editing && historyOpen) {
      void loadVersions();
    }
  }, [editing, historyOpen, loadVersions]);

  const saveEdit = useCallback(
    async (options?: { autosave?: boolean; stayInEditor?: boolean }) => {
      const autosave = options?.autosave ?? false;
      const stayInEditor = options?.stayInEditor ?? false;
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
          seriesSlug: current.seriesSlug.trim() || null,
          seriesTitle: current.seriesTitle.trim() || null,
          seriesOrder: parseSeriesOrder(current.seriesOrder),
          bodyMd: current.bodyMd,
          version: autosave ? "draft" : "manual",
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

      if (historyOpen) {
        void loadVersions();
      }

      if (autosave) {
        if (nextSlug !== post.slug) {
          setEditQuery(true, nextSlug);
        }
        router.refresh();
        return true;
      }

      toast.add({ title: "Saved as version", type: "success" });

      if (stayInEditor) {
        if (nextSlug !== post.slug) {
          setEditQuery(true, nextSlug);
        }
        router.refresh();
        return true;
      }

      setEditing(false);
      setHistoryOpen(false);

      if (nextSlug !== post.slug) {
        router.replace(`/blog/${nextSlug}`);
        router.refresh();
        return true;
      }

      setEditQuery(false, nextSlug);
      router.refresh();
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historyOpen, loadVersions, post.slug, router, searchParams],
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
    const nextOutline = extractTocFromMarkdown(post.bodyMd);
    setOutline(nextOutline);
    setDirty(false);
    setMobileTab("write");
    setEditing(true);
    setEditQuery(true);
  }

  function cancelEdit() {
    setEditing(false);
    setHistoryOpen(false);
    const next = draftFromPost(post);
    setDraft(next);
    lastSavedRef.current = next;
    setPreviewHtml(post.bodyHtml);
    const nextOutline = extractTocFromMarkdown(post.bodyMd);
    setOutline(nextOutline);
    setDirty(false);
    setEditQuery(false);
  }

  async function restoreVersion(versionId: string) {
    if (!confirm("Restore this version? Current content will be saved first.")) {
      return;
    }

    setRestoring(true);

    if (dirty) {
      const saved = await saveEdit({ stayInEditor: true });
      if (!saved) {
        setRestoring(false);
        return;
      }
    }

    const res = await fetch("/api/posts/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: postIdRef.current,
        versionId,
      }),
    });
    setRestoring(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.add({
        title: data?.error || "Could not restore version",
        type: "error",
      });
      return;
    }

    const data = (await res.json()) as {
      post: EditablePost & {
        tags: { id: string; name: string; slug: string }[];
      };
      versions: PostVersionItem[];
    };

    const nextDraft: Draft = {
      title: data.post.title,
      slug: data.post.slug,
      excerpt: data.post.excerpt,
      tags: data.post.tags.map((tag) => tag.name).join(", "),
      visibility: data.post.visibility,
      seriesSlug: data.post.series?.slug ?? "",
      seriesTitle: data.post.series?.title ?? "",
      seriesOrder:
        data.post.series?.order != null ? String(data.post.series.order) : "",
      bodyMd: data.post.bodyMd,
    };
    setDraft(nextDraft);
    lastSavedRef.current = nextDraft;
    setDirty(false);
    setPreviewHtml(data.post.bodyHtml);
    const nextOutline = extractTocFromMarkdown(data.post.bodyMd);
    setOutline(nextOutline);
    setVersions(
      data.versions.map((version) => ({
        ...version,
        createdAt:
          typeof version.createdAt === "string"
            ? version.createdAt
            : new Date(version.createdAt).toISOString(),
      })),
    );
    toast.add({ title: "Version restored", type: "success" });

    if (data.post.slug !== post.slug) {
      router.replace(`/blog/${data.post.slug}?edit=1`);
    }
    router.refresh();
  }

  async function copyMarkdown() {
    const source = serializePostToMarkdown({
      title: draft.title.trim() || post.title,
      slug: draft.slug.trim() || post.slug,
      excerpt: draft.excerpt,
      visibility: draft.visibility,
      tags: parseTagsInput(draft.tags),
      seriesSlug: draft.seriesSlug.trim() || null,
      seriesTitle: draft.seriesTitle.trim() || null,
      seriesOrder: parseSeriesOrder(draft.seriesOrder),
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
    const selectedVersion =
      versions.find((version) => version.id === selectedVersionId) ?? null;

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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Version history"
                  aria-pressed={historyOpen}
                  onClick={() => setHistoryOpen((open) => !open)}
                />
              }
            >
              <History className="size-4" aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="bottom">Versions</TooltipContent>
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
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs text-muted-foreground">
              Series slug
              <input
                type="text"
                value={draft.seriesSlug}
                onChange={(e) =>
                  setDraft({ ...draft, seriesSlug: e.target.value })
                }
                placeholder="dp-patterns"
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Series title
              <input
                type="text"
                value={draft.seriesTitle}
                onChange={(e) =>
                  setDraft({ ...draft, seriesTitle: e.target.value })
                }
                placeholder="DP Patterns"
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Series order
              <input
                type="text"
                inputMode="numeric"
                value={draft.seriesOrder}
                onChange={(e) =>
                  setDraft({ ...draft, seriesOrder: e.target.value })
                }
                placeholder="1"
                className={`${fieldClass} mt-1`}
              />
            </label>
          </div>
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
          <button
            type="button"
            onClick={() => setMobileTab("index")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition",
              mobileTab === "index"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Index
            {outline.length > 0 ? (
              <span className="ml-1 opacity-70">{outline.length}</span>
            ) : null}
          </button>
        </div>

        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1 overflow-hidden",
            historyOpen
              ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_17rem]"
              : "md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_14rem]",
          )}
        >
          <div
            className={cn(
              "min-h-0 min-w-0 border-border md:border-r",
              mobileTab === "write" ? "flex" : "hidden md:flex",
            )}
          >
            <textarea
              ref={editorRef}
              value={draft.bodyMd}
              onChange={(e) =>
                setDraft({ ...draft, bodyMd: e.target.value })
              }
              onScroll={handleEditorScroll}
              spellCheck={false}
              aria-label="Markdown body"
              className="h-full min-h-[50dvh] w-full resize-none bg-code-bg/40 px-4 py-4 font-mono text-[13px] leading-relaxed outline-none sm:px-5 md:min-h-0"
            />
          </div>
          <div
            ref={bindPreviewEl}
            onScroll={handlePreviewScroll}
            onClick={handlePreviewClick}
            className={cn(
              "min-h-0 min-w-0 overflow-y-auto px-4 py-4 sm:px-5",
              mobileTab === "preview" ? "block" : "hidden md:block",
            )}
          >
            {historyOpen && selectedVersion ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {selectedVersion.kind === "draft"
                        ? "Draft preview"
                        : "Version preview"}
                    </p>
                    <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                      {selectedVersion.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    disabled={restoring}
                    onClick={() => void restoreVersion(selectedVersion.id)}
                    className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-60"
                  >
                    {restoring ? "Restoring…" : "Rollback"}
                  </button>
                </div>
                {selectedVersion.excerpt ? (
                  <p className="mb-6 text-muted-foreground">
                    {selectedVersion.excerpt}
                  </p>
                ) : null}
                <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-muted-foreground">
                  {selectedVersion.bodyMd}
                </pre>
              </>
            ) : (
              <>
                <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                  {draft.title.trim() || "Untitled"}
                </h2>
                {draft.excerpt.trim() ? (
                  <p className="mb-6 text-muted-foreground">{draft.excerpt}</p>
                ) : null}
                <p className="mb-4 text-xs text-muted-foreground">
                  Scroll syncs with the editor · click a heading to jump to it
                </p>
                <ProseContent
                  html={previewHtml}
                  className="[&_h1]:cursor-pointer [&_h2]:cursor-pointer [&_h3]:cursor-pointer"
                />
              </>
            )}
          </div>
          {historyOpen ? (
            <aside
              className={cn(
                "min-h-0 min-w-0 overflow-y-auto border-t border-border md:border-l md:border-t-0",
                mobileTab === "index" ? "block" : "hidden md:block",
              )}
            >
              <div className="px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  History
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Manual saves are kept. Autosave keeps one draft.
                </p>
              </div>
              {versionsLoading ? (
                <p className="px-4 text-sm text-muted-foreground">Loading…</p>
              ) : versions.length === 0 ? (
                <p className="px-4 text-sm text-muted-foreground">
                  No versions yet. Save to create one.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {versions.map((version) => (
                    <li key={version.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedVersionId(version.id)}
                        className={cn(
                          "w-full px-4 py-3 text-left transition hover:bg-accent-soft/50",
                          selectedVersionId === version.id
                            ? "bg-accent-soft"
                            : null,
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatVersionTime(version.createdAt)}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
                              version.kind === "draft"
                                ? "bg-code-bg text-muted-foreground"
                                : "bg-accent-soft text-primary",
                            )}
                          >
                            {version.kind === "draft" ? "draft" : "saved"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {version.title}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          ) : (
            <aside
              className={cn(
                "min-h-0 min-w-0 border-t border-border bg-background md:border-l md:border-t-0",
                mobileTab === "index" ? "flex" : "hidden md:flex",
              )}
            >
              <EditorOutline
                items={outline}
                onSelect={jumpToOutlineItem}
                scrollRoot={historyOpen ? null : previewEl}
                className="h-full w-full"
              />
            </aside>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
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
              <time dateTime={post.publishedDateTime}>
                {post.publishedLabel}
              </time>
            ) : null}
            {post.readingLabel ? <span>{post.readingLabel}</span> : null}
            {post.series ? (
              <Badge
                variant="outline"
                render={<Link href={`/series/${post.series.slug}`} />}
                className="no-underline"
              >
                {post.series.title}
                {post.series.order != null ? ` · Part ${post.series.order}` : ""}
              </Badge>
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

        {outline.length > 0 ? (
          <div className="mb-10 overflow-hidden rounded-lg border border-border min-[1320px]:hidden">
            <EditorOutline
              items={outline}
              onSelect={jumpToReadHeading}
              scrollRoot="window"
              bookmarkedId={bookmarkedHeadingId}
              onToggleBookmark={toggleSectionBookmark}
              onJumpToBookmark={jumpToBookmark}
            />
          </div>
        ) : null}

        <ProseContent html={post.bodyHtml} />

        {post.series && seriesNav ? (
          <SeriesNav
            seriesTitle={post.series.title}
            seriesSlug={post.series.slug}
            previous={seriesNav.previous}
            next={seriesNav.next}
            index={seriesNav.index}
            total={seriesNav.total}
          />
        ) : null}
        {relatedPosts?.length ? <RelatedPosts posts={relatedPosts} /> : null}
      </article>

      {outline.length > 0 ? (
        <aside
          className="fixed top-20 z-30 hidden h-[calc(100dvh-6.5rem)] w-56 flex-col overflow-hidden rounded-lg border border-border bg-background/95 shadow-soft min-[1320px]:flex"
          style={{ left: "calc(50% + 24rem + 2.75rem)" }}
        >
          <EditorOutline
            items={outline}
            onSelect={jumpToReadHeading}
            scrollRoot="window"
            bookmarkedId={bookmarkedHeadingId}
            onToggleBookmark={toggleSectionBookmark}
            onJumpToBookmark={jumpToBookmark}
            className="h-full min-h-0"
          />
        </aside>
      ) : null}
    </>
  );
}
