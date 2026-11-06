import { CampusImage } from "@/components/brand/campus-image";
import Link from "next/link";

import { Wordmark } from "@/components/brand/crest";
import { CAMPUS_PHOTOS } from "@/components/brand/campus-photos";

const HOME_LINK =
  "focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none";

/** The road runs down the middle of this photo, leaving forest behind the card. */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative isolate min-h-svh bg-[oklch(var(--ink))]">
      <div className="auth-backdrop fixed inset-0 -z-10">
        <CampusImage
          photo={CAMPUS_PHOTOS.hostelRoad}
          priority
          alt=""
          sizes="max(100vw, 178vh)"
          className="object-cover object-[35%_50%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[oklch(var(--ink)/0.7)] to-[oklch(var(--ink)/0.15)] lg:bg-gradient-to-r lg:from-[oklch(var(--ink)/0.78)] lg:via-[oklch(var(--ink)/0.25)] lg:to-transparent"
        />
      </div>
      <div className="mx-auto grid min-h-svh w-full max-w-7xl lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <aside className="dark text-foreground hidden flex-col justify-between bg-transparent p-12 lg:flex">
          <Link href="/" className={`self-start ${HOME_LINK}`}>
            <Wordmark />
          </Link>
          <div>
            <p className="font-display max-w-lg text-[clamp(2.5rem,4vw,3.75rem)] leading-[1.06] font-semibold tracking-[-0.02em] text-balance text-white">
              The official alumni network of NIT Arunachal Pradesh.
            </p>
            <p className="mt-4 text-white/85">
              Verified by NIT Arunachal Pradesh
            </p>
          </div>
        </aside>
        <main className="flex flex-col items-center justify-center gap-8 px-4 py-10">
          <Link
            href="/"
            className={`dark text-foreground lg:hidden ${HOME_LINK}`}
          >
            <Wordmark compact />
          </Link>
          <div className="flex w-full max-w-md justify-center">{children}</div>
        </main>
      </div>
    </div>
  );
}
