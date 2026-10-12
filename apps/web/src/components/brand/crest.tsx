import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/** The institute's emblem as a decorative mark beside a name. */
export function Crest({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("emblem w-8 shrink-0", className)} />
  );
}

/** The emblem at display size, announced to assistive tech. */
export function Seal({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Emblem of the National Institute of Technology Arunachal Pradesh"
      className={cn("emblem w-64", className)}
    />
  );
}

export function Wordmark({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="flex items-center gap-2">
        <Crest className="w-7" />
        <span className="font-semibold tracking-tight">
          {siteConfig.shortName}
        </span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-3">
      <Crest className="w-10" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.05rem] font-semibold tracking-tight">
          Alumni Network
        </span>
        <span className="text-muted-foreground mt-1 text-[0.72rem] font-medium">
          NIT Arunachal Pradesh
        </span>
      </span>
    </span>
  );
}
