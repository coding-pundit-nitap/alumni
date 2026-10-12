import { Crest } from "@/components/brand/crest";

/**
 * Root fallback: covers public, (app) and admin routes, so it carries no site
 * chrome.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading application..."
      className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 p-8"
    >
      <Crest className="w-12 motion-safe:animate-pulse" />
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  );
}
