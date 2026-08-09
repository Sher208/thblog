"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { TocItem } from "@/lib/toc";
import { cn } from "@/lib/utils";

export function EditorOutline({
  items,
  onSelect,
  className,
  /** When set, tracks the active heading while scrolling (window or a container). */
  scrollRoot = null,
}: {
  items: TocItem[];
  onSelect: (item: TocItem) => void;
  className?: string;
  scrollRoot?: "window" | HTMLElement | null;
}) {
  const [activeId, setActiveId] = useState<string | null>(
    () => items[0]?.id ?? null,
  );
  const activeIdRef = useRef<string | null>(activeId);
  const activeRef = useRef<HTMLButtonElement>(null);
  const rafId = useRef(0);
  const ignoreScrollUntil = useRef(0);

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

    function applyActiveId(next: string | null) {
      if (next === activeIdRef.current) return;
      activeIdRef.current = next;
      setActiveId(next);
    }

    function scheduleUpdate() {
      if (performance.now() < ignoreScrollUntil.current) return;
      if (rafId.current) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = 0;
        applyActiveId(readActiveId());
      });
    }

    applyActiveId(readActiveId());

    function resumeFromUserScroll() {
      ignoreScrollUntil.current = 0;
      scheduleUpdate();
    }

    const target: HTMLElement | Window = rootEl ?? window;
    target.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    target.addEventListener("wheel", resumeFromUserScroll, { passive: true });
    target.addEventListener("touchmove", resumeFromUserScroll, {
      passive: true,
    });
    return () => {
      target.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      target.removeEventListener("wheel", resumeFromUserScroll);
      target.removeEventListener("touchmove", resumeFromUserScroll);
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

  function handleSelect(item: TocItem, event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.focus({ preventScroll: true });
    activeIdRef.current = item.id;
    setActiveId(item.id);
    // Ignore scroll-spy briefly while smooth/programmatic jump runs,
    // then resume tracking from the real scroll position.
    ignoreScrollUntil.current = performance.now() + 450;
    onSelect(item);
    window.setTimeout(() => {
      ignoreScrollUntil.current = 0;
      if (!scrollRoot) return;
      const rootEl = scrollRoot === "window" ? null : scrollRoot;
      const headings = items
        .map((entry) => document.getElementById(entry.id))
        .filter((el): el is HTMLElement => Boolean(el));
      if (!headings.length) return;

      let next = headings[0]?.id ?? null;
      if (rootEl) {
        const marker =
          rootEl.scrollTop + Math.min(80, rootEl.clientHeight * 0.2);
        for (const heading of headings) {
          if (heading.offsetTop <= marker) next = heading.id;
          else break;
        }
      } else {
        const marker = 140;
        for (const heading of headings) {
          if (heading.getBoundingClientRect().top <= marker) next = heading.id;
          else break;
        }
      }
      if (next !== activeIdRef.current) {
        activeIdRef.current = next;
        setActiveId(next);
      }
    }, 480);
  }

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
                  onClick={(event) => handleSelect(item, event)}
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
