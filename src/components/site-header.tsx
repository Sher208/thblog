import Link from "next/link";
import { ThemeToggle } from "./theme-provider";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function SiteHeader({
  brand = "thblog",
  showAdmin = false,
}: {
  brand?: string;
  showAdmin?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--header-bg)] backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between gap-4 px-5">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-[1.05rem] tracking-tight text-foreground no-underline transition hover:text-primary"
        >
          {brand}
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          <Link
            href="/tags"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground no-underline",
            )}
          >
            Topics
          </Link>
          {showAdmin ? (
            <Link
              href="/admin"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground no-underline",
              )}
            >
              Admin
            </Link>
          ) : null}
          <Separator orientation="vertical" className="mx-1.5 h-4!" />
          <ThemeToggle />
        </nav>
      </div>
      <Separator />
    </header>
  );
}
