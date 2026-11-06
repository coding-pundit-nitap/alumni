import { CampusImage } from "@/components/brand/campus-image";
import type { ReactNode } from "react";

import {
  CAMPUS_PHOTOS,
  type CampusPhoto,
} from "@/components/brand/campus-photos";
import { legalConfig } from "@/config/legal";

/**
 * Shared body for the supporting pages (Terms, Contact): a campus photo
 * carrying the title and last-updated line, then the draft notice and sections.
 * Sits inside PublicShell and runs under its header.
 */
export function LegalPage({
  title,
  intro,
  photo = CAMPUS_PHOTOS.hillsideAerial,
  children,
}: {
  title: string;
  intro: ReactNode;
  photo?: CampusPhoto;
  children: ReactNode;
}) {
  const updated = new Date(`${legalConfig.lastUpdated}T00:00:00Z`);
  return (
    <article>
      <header className="relative isolate -mt-[4.25rem] flex min-h-[clamp(20rem,56svh,36rem)] items-end overflow-hidden bg-[oklch(var(--ink))] text-white">
        <CampusImage
          photo={photo}
          priority
          alt=""
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(var(--ink)/0.88)] via-[oklch(var(--ink)/0.35)] via-50% to-transparent"
        />
        <div className="mx-auto w-full max-w-3xl px-4 pb-8 sm:px-8 sm:pb-10">
          <h1 className="font-display text-[clamp(2.75rem,6vw,5rem)] leading-[1.04] font-semibold tracking-[-0.025em] text-balance">
            {title}
          </h1>
          <p className="mt-3 text-sm text-white/85">
            Last updated{" "}
            <time dateTime={legalConfig.lastUpdated}>
              {updated.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </time>
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
        {legalConfig.approved ? null : (
          <p
            role="note"
            className="border-brand/30 bg-brand/5 mb-8 rounded-2xl border px-4 py-3 text-sm"
          >
            This page is a draft awaiting approval by NIT Arunachal Pradesh. The
            approved text will replace it.
          </p>
        )}
        <div className="text-muted-foreground text-lg leading-relaxed text-pretty">
          {intro}
        </div>
        <div className="mt-12 space-y-12">{children}</div>
      </div>
    </article>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2
        id={id}
        className="font-display text-foreground text-2xl font-semibold tracking-tight"
      >
        {title}
      </h2>
      <div className="text-muted-foreground [&_a]:text-foreground space-y-3 text-[15px] leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
