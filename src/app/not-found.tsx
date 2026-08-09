import Link from "next/link";

export default function NotFound() {
  return (
    <div className="animate-fade-up py-16 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
        Not found
      </h1>
      <p className="mt-2 text-muted">
        This post is private or does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-accent underline-offset-2 hover:underline"
      >
        Back home
      </Link>
    </div>
  );
}
