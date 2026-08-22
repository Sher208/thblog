"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Highlighter, StickyNote, Trash2, X } from "lucide-react";
import { ProseContent } from "@/components/prose-content";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import {
  applyAnnotations,
  createSelectorFromRange,
  getSelectionRangeInRoot,
} from "@/lib/annotations/anchor";
import {
  createAnnotation,
  listAnnotations,
  removeAnnotation,
  updateAnnotation,
} from "@/lib/annotations/store";
import type { Annotation } from "@/lib/annotations/types";
import { cn } from "@/lib/utils";

type MenuState = {
  x: number;
  y: number;
  kind: "create" | "note";
};

type PendingSelector = NonNullable<
  ReturnType<typeof createSelectorFromRange>
>;

type AnnotationLayerProps = {
  postId: string;
  html: string;
  className?: string;
  enabled?: boolean;
};

export function AnnotationLayer({
  postId,
  html,
  className,
  enabled = true,
}: AnnotationLayerProps) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isAuthenticated = Boolean(session?.user);
  const proseRef = useRef<HTMLDivElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [pendingSelector, setPendingSelector] =
    useState<PendingSelector | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteEditorPos, setNoteEditorPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  const repaint = useCallback(() => {
    const root = proseRef.current;
    if (!root || !enabled) return;
    applyAnnotations(root, annotations);
  }, [annotations, enabled]);

  useEffect(() => {
    if (sessionPending || !enabled) return;
    let cancelled = false;
    setLoaded(false);
    void listAnnotations(postId, isAuthenticated)
      .then((items) => {
        if (!cancelled) {
          setAnnotations(items);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.add({ title: "Could not load annotations", type: "error" });
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [postId, isAuthenticated, sessionPending, enabled]);

  useLayoutEffect(() => {
    if (!loaded || !enabled) return;
    repaint();
  }, [loaded, html, repaint, enabled]);

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(null);
        setPendingSelector(null);
        setActiveNoteId(null);
        setNoteEditorPos(null);
        setNoteDraft("");
      }
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (
        menuRef.current?.contains(target) ||
        noteRef.current?.contains(target)
      ) {
        return;
      }
      // Keep note editor open when clicking its mark
      if (
        target instanceof Element &&
        target.closest("mark[data-annotation-id]")
      ) {
        return;
      }
      setMenu(null);
      if (!noteRef.current?.contains(target)) {
        setActiveNoteId(null);
        setNoteEditorPos(null);
        setPendingSelector(null);
        setNoteDraft("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [enabled]);

  const openCreateMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const root = proseRef.current;
      if (!root) return;
      const range = getSelectionRangeInRoot(root);
      if (!range) return;

      event.preventDefault();
      const selector = createSelectorFromRange(root, range);
      if (!selector) return;

      setPendingSelector(selector);
      setActiveNoteId(null);
      setNoteDraft("");
      setNoteEditorPos(null);
      setMenu({
        x: event.clientX,
        y: event.clientY,
        kind: "create",
      });
    },
    [enabled],
  );

  const handleHighlight = useCallback(async () => {
    if (!pendingSelector) return;
    try {
      const created = await createAnnotation(
        {
          postId,
          kind: "highlight",
          body: "",
          ...pendingSelector,
        },
        isAuthenticated,
      );
      setAnnotations((prev) => [...prev, created]);
      setMenu(null);
      setPendingSelector(null);
      window.getSelection()?.removeAllRanges();
    } catch {
      toast.add({ title: "Could not save highlight", type: "error" });
    }
  }, [pendingSelector, postId, isAuthenticated]);

  const openNoteComposer = useCallback(() => {
    if (!menu) return;
    setNoteEditorPos({ x: menu.x, y: menu.y });
    setMenu(null);
    setNoteDraft("");
    setActiveNoteId(null);
  }, [menu]);

  const saveNote = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      const body = noteDraft.trim();
      if (!body) return;

      try {
        if (activeNoteId) {
          const updated = await updateAnnotation(
            postId,
            activeNoteId,
            { body, kind: "note" },
            isAuthenticated,
          );
          if (updated) {
            setAnnotations((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a)),
            );
          }
        } else if (pendingSelector) {
          const created = await createAnnotation(
            {
              postId,
              kind: "note",
              body,
              ...pendingSelector,
            },
            isAuthenticated,
          );
          setAnnotations((prev) => [...prev, created]);
          window.getSelection()?.removeAllRanges();
        }
        setPendingSelector(null);
        setActiveNoteId(null);
        setNoteEditorPos(null);
        setNoteDraft("");
      } catch {
        toast.add({ title: "Could not save note", type: "error" });
      }
    },
    [
      noteDraft,
      activeNoteId,
      pendingSelector,
      postId,
      isAuthenticated,
    ],
  );

  const deleteActive = useCallback(async () => {
    if (!activeNoteId) return;
    try {
      await removeAnnotation(postId, activeNoteId, isAuthenticated);
      setAnnotations((prev) => prev.filter((a) => a.id !== activeNoteId));
      setActiveNoteId(null);
      setNoteEditorPos(null);
      setNoteDraft("");
    } catch {
      toast.add({ title: "Could not delete annotation", type: "error" });
    }
  }, [activeNoteId, postId, isAuthenticated]);

  const onProseClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const target = event.target as HTMLElement | null;
      const mark = target?.closest<HTMLElement>("mark[data-annotation-id]");
      if (!mark) return;

      const id = mark.dataset.annotationId;
      if (!id) return;
      const annotation = annotations.find((a) => a.id === id);
      if (!annotation) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = mark.getBoundingClientRect();
      setMenu(null);
      setPendingSelector(null);
      setActiveNoteId(id);
      setNoteDraft(annotation.body);
      setNoteEditorPos({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
    },
    [annotations, enabled],
  );

  const activeAnnotation = activeNoteId
    ? annotations.find((a) => a.id === activeNoteId)
    : null;
  const showNoteEditor =
    noteEditorPos && (pendingSelector || activeAnnotation);

  return (
    <div className={cn("relative", className)}>
      <ProseContent
        ref={proseRef}
        html={html}
        onContextMenu={enabled ? openCreateMenu : undefined}
        onClick={onProseClick}
      />

      {menu?.kind === "create" ? (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 flex min-w-40 flex-col gap-0.5 rounded-lg border border-border bg-background p-1 shadow-soft"
          style={{
            left: Math.min(menu.x, window.innerWidth - 180),
            top: Math.min(menu.y, window.innerHeight - 100),
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => void handleHighlight()}
          >
            <Highlighter data-icon="inline-start" />
            Highlight
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={openNoteComposer}
          >
            <StickyNote data-icon="inline-start" />
            Add note
          </Button>
        </div>
      ) : null}

      {showNoteEditor && noteEditorPos ? (
        <div
          ref={noteRef}
          className="fixed z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-background p-3 shadow-soft"
          style={{
            left: Math.min(
              Math.max(12, noteEditorPos.x - 160),
              window.innerWidth - 320,
            ),
            top: Math.min(noteEditorPos.y, window.innerHeight - 220),
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {activeAnnotation
                ? activeAnnotation.kind === "note" || activeAnnotation.body
                  ? "Note"
                  : "Highlight"
                : "Add note"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Close"
              onClick={() => {
                setActiveNoteId(null);
                setNoteEditorPos(null);
                setPendingSelector(null);
                setNoteDraft("");
              }}
            >
              <X />
            </Button>
          </div>
          {activeAnnotation?.quote || pendingSelector?.quote ? (
            <p className="mb-2 line-clamp-2 border-l-2 border-amber-500/60 pl-2 text-xs text-muted-foreground">
              {activeAnnotation?.quote ?? pendingSelector?.quote}
            </p>
          ) : null}
          <form onSubmit={(e) => void saveNote(e)}>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={4}
              placeholder="Write a note…"
              className="mb-2 w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              autoFocus
            />
            <div className="flex items-center justify-between gap-2">
              {activeAnnotation ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => void deleteActive()}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!noteDraft.trim()}
              >
                Save
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
