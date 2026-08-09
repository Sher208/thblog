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
    <header className="sticky top-0 z-40 border-b border-border/70 backdrop-blur-md"
      style={{ background: "var(--header-bg)" }}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-5">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg tracking-tight text-foreground"
        >
          {brand}
        </Link>
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link
            href="/tags"
            className="rounded-full px-3 py-1.5 transition hover:bg-accent-soft hover:text-foreground"
          >
            Topics
          </Link>
          {showAdmin ? (
            <Link
              href="/admin"
              className="rounded-full px-3 py-1.5 transition hover:bg-accent-soft hover:text-foreground"
            >
              Admin
            </Link>
          ) : null}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
