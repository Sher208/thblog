"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { TocItem } from "@/lib/markdown";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(false);

  if (!items.length) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="mb-12 border-l-2 border-primary/35 pl-4"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full max-w-sm items-center justify-between gap-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          On this page
        </span>
        <span
          aria-hidden
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform duration-200",
            open ? "rotate-0" : "-rotate-180",
          )}
        >
          <ChevronDown className="size-3.5" strokeWidth={2.25} />
        </span>
      </button>
      {open ? (
        <>
          <Separator className="my-3 max-w-48" />
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li
                key={item.id}
                className={item.level === 3 ? "pl-3" : undefined}
              >
                <a
                  href={`#${item.id}`}
                  className="text-muted-foreground no-underline transition hover:text-primary"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </nav>
  );
}
