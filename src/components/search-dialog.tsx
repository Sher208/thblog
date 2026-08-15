"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatReadingTime } from "@/lib/reading-time";
import { cn } from "@/lib/utils";

type SearchHit = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  readingMinutes: number;
  seriesTitle: string | null;
  tags: { id: string; name: string; slug: string }[];
};

export function SearchDialog() {
  const dialogId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isHotkey =
        (event.key === "k" || event.key === "K") &&
        (event.metaKey || event.ctrlKey);
      if (isHotkey) {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { results: SearchHit[] };
        setResults(data.results);
        setActiveIndex(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [open, query]);

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length ? (index + 1) % results.length : 0,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length ? (index - 1 + results.length) % results.length : 0,
      );
      return;
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      window.location.href = `/blog/${results[activeIndex]!.slug}`;
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Search posts"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-4" aria-hidden />
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/25 px-4 pt-[12vh] backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-label="Search posts"
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-soft"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <SearchIcon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search titles, tags, series…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoComplete="off"
                spellCheck={false}
              />
              {loading ? (
                <Loader2
                  className="size-4 shrink-0 animate-spin text-muted-foreground"
                  aria-hidden
                />
              ) : (
                <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                  Esc
                </kbd>
              )}
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {!query.trim() ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Type to search public posts
                  <span className="mt-1 block text-xs">
                    Tip: press Ctrl/⌘ K anytime
                  </span>
                </p>
              ) : results.length === 0 && !loading ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No matches for “{query.trim()}”
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {results.map((result, index) => (
                    <li key={result.id}>
                      <Link
                        href={`/blog/${result.slug}`}
                        onClick={close}
                        className={cn(
                          "block rounded-lg px-3 py-2.5 no-underline transition",
                          index === activeIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted",
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <span className="block font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-foreground">
                          {result.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatReadingTime(result.readingMinutes)}</span>
                          {result.seriesTitle ? (
                            <span>Series · {result.seriesTitle}</span>
                          ) : null}
                          {result.tags.slice(0, 3).map((tag) => (
                            <span key={tag.id}>{tag.name}</span>
                          ))}
                        </span>
                        {result.excerpt ? (
                          <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                            {result.excerpt}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
