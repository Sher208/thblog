"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEventHandler,
} from "react";
import { createPortal } from "react-dom";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type CodeHost = {
  key: string;
  host: HTMLElement;
  pre: HTMLPreElement;
  lang: string | null;
};

function collectCodeHosts(root: HTMLElement): CodeHost[] {
  const figures = [
    ...root.querySelectorAll<HTMLElement>("[data-rehype-pretty-code-figure]"),
  ];
  const plainPres = [...root.querySelectorAll<HTMLPreElement>("pre")].filter(
    (pre) => !pre.closest("[data-rehype-pretty-code-figure]"),
  );

  return [...figures, ...plainPres].flatMap((host, index) => {
    const pre =
      host.tagName === "PRE"
        ? (host as HTMLPreElement)
        : host.querySelector("pre");
    if (!pre) return [];

    host.classList.add("code-block-host");
    const lang = pre.getAttribute("data-language");
    return [
      {
        key: `${index}-${lang ?? "code"}-${(pre.textContent ?? "").slice(0, 24)}`,
        host,
        pre,
        lang: lang && lang !== "txt" ? lang : null,
      },
    ];
  });
}

function CopyButton({
  pre,
  lang,
}: {
  pre: HTMLPreElement;
  lang: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(pre.textContent ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-block-toolbar" data-code-copy="">
      {lang ? <span className="code-block-lang">{lang}</span> : null}
      <button
        type="button"
        className="code-block-copy"
        aria-label={copied ? "Copied" : "Copy code"}
        data-copied={copied ? "true" : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void onCopy();
        }}
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </button>
    </div>
  );
}

type ProseContentProps = {
  html: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML">;

/** Renders Markdown HTML and mounts copy buttons onto fenced code blocks. */
export function ProseContent({
  html,
  className,
  onClick,
  ...rest
}: ProseContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hosts, setHosts] = useState<CodeHost[]>([]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) {
      setHosts([]);
      return;
    }
    setHosts(collectCodeHosts(root));
  }, [html]);

  return (
    <>
      <div
        ref={ref}
        className={cn("prose-blog", className)}
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: html }}
        {...rest}
      />
      {hosts.map((item) =>
        createPortal(
          <CopyButton key={item.key} pre={item.pre} lang={item.lang} />,
          item.host,
        ),
      )}
    </>
  );
}
