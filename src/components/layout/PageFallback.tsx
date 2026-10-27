/** Shown while a route's code chunk downloads. Deliberately quiet. */
export function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status">
      <span className="sr-only">Loading page</span>
      <span className="h-1 w-24 overflow-hidden rounded-full bg-contrast/10" aria-hidden="true">
        <span className="block h-full w-1/3 animate-pulse rounded-full bg-eng" />
      </span>
    </div>
  );
}
