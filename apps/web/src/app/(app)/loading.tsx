import { Skeleton } from "@nitap/ui/components/skeleton";

/**
 * Renders inside the member shell, so navigating between member pages never
 * flashes public chrome. Mirrors PageColumns (header bar, hairline column) so
 * nothing moves when the page arrives.
 */
export default function MemberLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="min-h-svh w-full md:border-r"
    >
      <div className="flex h-14 items-center border-b px-4 sm:px-5">
        <Skeleton className="h-5 w-40" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 border-b px-4 py-5 sm:px-5">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
