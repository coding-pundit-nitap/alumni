import Link from "next/link";

import { Ridgelines } from "@/components/brand/ridgelines";

import { Block } from "./lists";

/** Hides once the profile is complete. */
export function CompletenessCard({
  percent,
  missing,
}: {
  percent: number;
  missing: string[];
}) {
  if (percent >= 100) return null;
  return (
    <Block
      title={`Profile ${percent}% complete`}
      className="bg-background pb-14"
    >
      <Ridgelines className="absolute inset-x-0 bottom-0 -z-10 h-16 opacity-60" />
      <div
        role="progressbar"
        aria-label="Profile completeness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full"
      >
        <div
          className="bg-brand animate-in slide-in-from-left-full h-full rounded-full duration-700"
          style={{ width: `${Math.max(percent, 3)}%` }}
        />
      </div>
      <p className="text-muted-foreground py-2 text-xs">
        Still missing: {missing.join(", ")}
      </p>
      <Link
        href="/profile/details"
        className="bg-foreground text-background focus-visible:ring-ring inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition-transform duration-150 ease-out outline-none focus-visible:ring-2 active:scale-[0.97]"
      >
        Finish profile
      </Link>
    </Block>
  );
}
