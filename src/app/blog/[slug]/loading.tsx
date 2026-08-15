export default function BlogPostLoading() {
  return (
    <div
      className="animate-pulse pb-16"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading article"
    >
      <div className="mb-6 h-8 w-28 rounded-md bg-muted" />
      <div className="mb-4 h-4 w-16 rounded bg-muted" />
      <div className="mb-4 h-10 w-[min(100%,28rem)] rounded-md bg-muted" />
      <div className="mb-8 flex gap-3">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-20 rounded-full bg-muted" />
      </div>
      <div className="mb-10 h-px w-full bg-border" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-[94%] rounded bg-muted" />
        <div className="h-4 w-[88%] rounded bg-muted" />
        <div className="h-4 w-[96%] rounded bg-muted" />
        <div className="mt-6 h-4 w-full rounded bg-muted" />
        <div className="h-4 w-[90%] rounded bg-muted" />
        <div className="h-4 w-[70%] rounded bg-muted" />
      </div>
    </div>
  );
}
