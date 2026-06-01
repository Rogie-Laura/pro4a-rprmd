function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--app-border)]/60 ${className ?? ''}`}
      aria-hidden
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy="true" aria-label="Loading personnel list">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <SkeletonBar className="h-8 w-52" />
        <SkeletonBar className="h-8 w-52" />
        <SkeletonBar className="h-8 w-32" />
        <SkeletonBar className="h-8 w-20" />
        <SkeletonBar className="h-8 w-40" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)]">
        <SkeletonBar className="h-9 w-full rounded-none" />
        <div className="space-y-2 p-2">
          {Array.from({ length: 14 }).map((_, index) => (
            <SkeletonBar key={index} className="h-6 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
