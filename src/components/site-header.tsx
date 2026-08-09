import Link from "next/link";
import { ThemeToggle } from "./theme-provider";

export function SiteHeader({
  brand = "thblog",
  showAdmin = false,
}: {
  brand?: string;
  showAdmin?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--header-bg)] backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between gap-6 px-5">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-[1.05rem] tracking-tight text-foreground no-underline transition hover:text-accent"
        >
          {brand}
        </Link>
        <nav
          aria-label="Primary"
          className="flex items-center gap-5 text-[0.8125rem] text-muted"
        >
          <Link
            href="/tags"
            className="inline-flex min-h-10 items-center text-muted no-underline transition hover:text-foreground"
          >
            Topics
          </Link>
          {showAdmin ? (
            <Link
              href="/admin"
              className="inline-flex min-h-10 items-center text-muted no-underline transition hover:text-foreground"
            >
              Admin
            </Link>
          ) : null}
          <span className="h-3 w-px bg-border" aria-hidden />
          <ThemeToggle />
        </nav>
      </div>
      <div className="h-px bg-border/70" aria-hidden />
    </header>
  );
}
