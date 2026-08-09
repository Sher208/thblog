import type { TocItem } from "@/lib/markdown";

export function TableOfContents({ items }: { items: TocItem[] }) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="mb-12 border-l-2 border-accent/40 pl-4"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        On this page
      </p>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? "pl-3" : undefined}>
            <a
              href={`#${item.id}`}
              className="text-muted no-underline transition hover:text-accent"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
