"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type MouseEventHandler,
  type MutableRefObject,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";

type ProseContentProps = {
  html: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
} & Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "dangerouslySetInnerHTML"
>;

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): (value: T | null) => void {
  return (value) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(value);
      else (ref as MutableRefObject<T | null>).current = value;
    }
  };
}

/** Renders Markdown HTML and handles code-block copy buttons. */
export const ProseContent = forwardRef<HTMLDivElement, ProseContentProps>(
  function ProseContent(
    { html, className, onClick, onContextMenu, ...rest },
    forwardedRef,
  ) {
    const localRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const root = localRef.current;
      if (!root) return;
      const container = root;

      for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
        const href = anchor.getAttribute("href");
        if (!href || href.startsWith("#")) continue;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      }

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
        ref={mergeRefs(localRef, forwardedRef)}
        className={cn("prose-blog", className)}
        onClick={onClick}
        onContextMenu={onContextMenu}
        dangerouslySetInnerHTML={{ __html: html }}
        {...rest}
      />
    );
  },
);
