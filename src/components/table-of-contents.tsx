import type { TocItem } from "@/lib/markdown";
import { Separator } from "@/components/ui/separator";

export function TableOfContents({ items }: { items: TocItem[] }) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="mb-12 border-l-2 border-primary/35 pl-4"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        On this page
      </p>
      <Separator className="my-3 max-w-48" />
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? "pl-3" : undefined}>
            <a
              href={`#${item.id}`}
              className="text-muted-foreground no-underline transition hover:text-primary"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
