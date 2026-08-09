"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/toc";
import { cn } from "@/lib/utils";

export function EditorOutline({
  items,
  activeId: controlledActiveId,
  onSelect,
  className,
  /** When set, tracks the active heading while scrolling (window or a container). */
  scrollRoot = null,
}: {
  items: TocItem[];
  activeId?: string | null;
  onSelect: (item: TocItem) => void;
  className?: string;
  scrollRoot?: "window" | HTMLElement | null;
}) {
  const [localActiveId, setLocalActiveId] = useState<string | null>(
    () => controlledActiveId ?? items[0]?.id ?? null,
  );
  const activeRef = useRef<HTMLButtonElement>(null);
  const pendingActiveId = useRef<string | null>(null);
  const rafId = useRef(0);

  const activeId = controlledActiveId ?? localActiveId;

  useEffect(() => {
    if (controlledActiveId != null) {
      setLocalActiveId(controlledActiveId);
    }
  }, [controlledActiveId]);

  useEffect(() => {
    if (!scrollRoot || items.length === 0) return;

    const rootEl = scrollRoot === "window" ? null : scrollRoot;

    function readActiveId(): string | null {
      const headings = items
        .map((item) => document.getElementById(item.id))
        .filter((el): el is HTMLElement => Boolean(el));
      if (!headings.length) return null;

      if (rootEl) {
        const marker =
          rootEl.scrollTop + Math.min(80, rootEl.clientHeight * 0.2);
        let current = headings[0]?.id ?? null;
        for (const heading of headings) {
          if (heading.offsetTop <= marker) current = heading.id;
          else break;
        }
        return current;
      }

      const marker = 140;
      let current = headings[0]?.id ?? null;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= marker) {
          current = heading.id;
        } else {
          break;
        }
      }
      return current;
    }

    function scheduleUpdate() {
      if (rafId.current) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = 0;
        const next = readActiveId();
        if (next === pendingActiveId.current) return;
        pendingActiveId.current = next;
        setLocalActiveId(next);
      });
    }

    scheduleUpdate();

    const target: HTMLElement | Window = rootEl ?? window;
    target.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      target.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [items, scrollRoot]);

  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    const container = el.closest("ul");
    if (!(container instanceof HTMLElement)) return;

    const extra = 8;
    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;

    if (elTop < viewTop + extra) {
      container.scrollTop = Math.max(0, elTop - extra);
    } else if (elBottom > viewBottom - extra) {
      container.scrollTop = elBottom - container.clientHeight + extra;
    }
  }, [activeId]);

  return (
    <nav
      aria-label="Section index"
      className={cn("flex min-h-0 flex-col", className)}
    >
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Index
        </p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Add headings with #, ##, or ### to build an index.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={`${item.id}-${item.level}-${item.text}`}>
                <button
                  type="button"
                  ref={active ? activeRef : undefined}
                  onClick={() => {
                    pendingActiveId.current = item.id;
                    setLocalActiveId(item.id);
                    onSelect(item);
                  }}
                  className={cn(
                    "w-full rounded-md border-l-2 px-2.5 py-1.5 text-left text-sm",
                    item.level <= 1 && "font-semibold",
                    item.level === 2 && "font-medium",
                    item.level >= 3 && "pl-5 text-[13px]",
                    active
                      ? "border-primary bg-accent-soft text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-accent-soft/50 hover:text-foreground",
                  )}
                >
                  <span className="line-clamp-2">{item.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
