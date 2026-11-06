import { CampusImage } from "@/components/brand/campus-image";
import type { ReactNode } from "react";

import type { CampusPhoto } from "@/components/brand/campus-photos";

const PILL =
  "inline-flex h-12 items-center gap-2 rounded-full px-7 text-base font-semibold whitespace-nowrap transition-[background-color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none active:scale-[0.97]";

/** Buttons for use over photography: the colours stay fixed in both themes. */
export const PHOTO_PILL_SOLID = `${PILL} bg-white text-[oklch(var(--ink))] hover:bg-white/90`;
export const PHOTO_PILL_GLASS = `${PILL} glass-pill text-white`;

/**
 * A full-screen campus photo holding one short message, for pages with nothing
 * else to show. Sits inside PublicShell and runs under its header.
 */
export function PhotoPage({
  photo,
  title,
  lead,
  children,
}: {
  photo: CampusPhoto;
  title: string;
  /** Sits above the title. */
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="relative isolate -mt-[4.25rem] flex min-h-[calc(100svh-2.25rem)] items-end justify-center overflow-hidden bg-[oklch(var(--ink))] px-4 pt-28 pb-[clamp(2.5rem,8vh,5rem)] text-center text-white sm:px-8">
      <CampusImage
        photo={photo}
        priority
        alt=""
        sizes="max(100vw, 178vh)"
        className="-z-10 object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(var(--ink)/0.92)] via-[oklch(var(--ink)/0.55)] via-45% to-transparent to-80%"
      />
      <div className="flex max-w-2xl flex-col items-center">
        {lead}
        <h1 className="font-display rise-in text-[clamp(2.75rem,6vw,5rem)] leading-[1.04] font-semibold tracking-[-0.025em] text-balance">
          {title}
        </h1>
        {children}
      </div>
    </section>
  );
}
