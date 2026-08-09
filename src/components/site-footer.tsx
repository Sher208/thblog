import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto mt-20 max-w-3xl px-5 pb-12 text-sm text-muted-foreground">
      <Separator className="mb-8" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-[family-name:var(--font-display)] text-foreground">
            thblog
          </span>
          <span className="mx-2 text-border" aria-hidden>
            ·
          </span>
          Notes, patterns, and writing.
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/rss.xml"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "no-underline",
            )}
          >
            RSS
          </Link>
          <span className="px-2">© {year}</span>
        </div>
      </div>
    </footer>
  );
}
