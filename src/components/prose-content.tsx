"use client";

import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type MouseEventHandler,
} from "react";
import { cn } from "@/lib/utils";

type ProseContentProps = {
  html: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML">;

/** Renders Markdown HTML and handles code-block copy buttons. */
export function ProseContent({
  html,
  className,
  onClick,
  ...rest
}: ProseContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const container = root;

    async function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>("[data-code-copy-btn]");
      if (!button || !container.contains(button)) return;

      event.preventDefault();
      event.stopPropagation();

      const host = button.closest<HTMLElement>(
        "[data-rehype-pretty-code-figure], .code-block-host, pre",
      );
      const pre =
        host?.tagName === "PRE"
          ? (host as HTMLPreElement)
          : host?.querySelector("pre");
      if (!pre) return;

      try {
        await navigator.clipboard.writeText(pre.textContent ?? "");
        button.dataset.copied = "true";
        button.setAttribute("aria-label", "Copied");
        const copyIcon = button.querySelector<HTMLElement>(
          ".code-block-copy-icon--copy",
        );
        const checkIcon = button.querySelector<HTMLElement>(
          ".code-block-copy-icon--check",
        );
        if (copyIcon) copyIcon.hidden = true;
        if (checkIcon) checkIcon.hidden = false;
        window.setTimeout(() => {
          delete button.dataset.copied;
          button.setAttribute("aria-label", "Copy code");
          if (copyIcon) copyIcon.hidden = false;
          if (checkIcon) checkIcon.hidden = true;
        }, 1600);
      } catch {
        button.setAttribute("aria-label", "Copy failed");
      }
    }

    root.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [html]);

  return (
    <div
      ref={ref}
      className={cn("prose-blog", className)}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
      {...rest}
    />
  );
}
