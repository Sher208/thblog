import type { TocItem } from "@/lib/markdown";

export function TableOfContents({ items }: { items: TocItem[] }) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="mb-10 border-l border-border pl-4"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">
        On this page
      </p>
      <ul className="space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? "pl-3" : undefined}>
            <a
              href={`#${item.id}`}
              className="text-muted transition hover:text-accent"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
