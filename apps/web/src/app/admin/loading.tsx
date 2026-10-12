import { Skeleton } from "@nitap/ui/components/skeleton";

/**
 * Mirrors AdminPageHeader's sticky bar and a panel, so nothing moves when the
 * page arrives.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
      <div className="-mx-4 flex min-h-14 flex-col justify-center gap-1.5 border-b px-4 py-2.5 sm:-mx-6 sm:px-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="overflow-hidden rounded-xl border">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none border-b" />
        ))}
      </div>
    </div>
  );
}
