import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="animate-fade-up py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Not found
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-lg text-muted-foreground">
        This post is private or does not exist.
      </p>
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "default", size: "default" }),
          "mt-8 inline-flex no-underline",
        )}
      >
        Back home
      </Link>
    </div>
  );
}
