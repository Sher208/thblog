import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto mt-20 max-w-3xl px-5 pb-12 text-sm text-muted">
      <div className="flex flex-col gap-3 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-[family-name:var(--font-display)] text-foreground">
            thblog
          </span>
          <span className="mx-2 text-border" aria-hidden>
            ·
          </span>
          Notes, patterns, and writing.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/rss.xml"
            className="text-muted no-underline transition hover:text-accent"
          >
            RSS
          </Link>
          <span>© {year}</span>
        </div>
      </div>
    </footer>
  );
}
