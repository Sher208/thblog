import Link from "next/link";

export default function NotFound() {
  return (
    <div className="animate-fade-up py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Not found
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-lg text-muted">
        This post is private or does not exist.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center text-accent underline-offset-2 hover:underline"
      >
        Back home
      </Link>
    </div>
  );
}
