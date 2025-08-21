export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header skeleton */}
          <div className="px-4 lg:px-6">
            <div className="h-6 w-48 rounded-md bg-muted animate-pulse" />
            <div className="mt-2 h-4 w-72 rounded-md bg-muted/70 animate-pulse" />
          </div>

          {/* Filters skeleton */}
          <div className="px-4 lg:px-6">
            <div className="h-10 w-full max-w-xl rounded-md bg-muted animate-pulse" />
          </div>

          {/* Table skeleton */}
          <div className="px-4 lg:px-6">
            <div className="w-full overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-6 gap-2 border-b border-border bg-muted/30 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 w-24 rounded bg-muted animate-pulse" />
                ))}
              </div>
              {Array.from({ length: 8 }).map((_, r) => (
                <div
                  key={r}
                  className="grid grid-cols-6 gap-2 border-b border-border p-3 last:border-b-0"
                >
                  {Array.from({ length: 6 }).map((_, c) => (
                    <div
                      key={c}
                      className="h-4 w-full rounded bg-muted/70 animate-pulse"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Pagination skeleton */}
          <div className="px-4 lg:px-6">
            <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
              <div className="h-4 w-56 rounded bg-muted/70 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-11 w-24 rounded-md bg-muted/70 animate-pulse" />
                <div className="h-11 w-20 rounded-md bg-muted/70 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
