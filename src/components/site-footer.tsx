import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto mt-20 max-w-3xl px-5 pb-12 text-sm text-muted-foreground">
      <Separator className="mb-6" />
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0">© {year}</p>
        <Link
          href="/rss.xml"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0 no-underline",
          )}
        >
          RSS
        </Link>
      </div>
    </footer>
  );
}
