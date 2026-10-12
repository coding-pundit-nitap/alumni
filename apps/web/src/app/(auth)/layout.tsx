import Link from "next/link";

import { Ridgelines } from "@/components/brand/ridgelines";
import { Seal, Wordmark } from "@/components/brand/crest";

const HOME_LINK =
  "focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <aside className="dark bg-background text-foreground relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Ridgelines className="absolute inset-x-0 bottom-0 h-64 opacity-60" />
        <Link href="/" className={`relative self-start ${HOME_LINK}`}>
          <Wordmark />
        </Link>
        <div className="relative">
          <Seal className="w-28" />
          <p className="font-display mt-8 max-w-md text-4xl leading-tight font-semibold tracking-tight text-balance">
            The official alumni network of NIT Arunachal Pradesh.
          </p>
        </div>
        <p className="text-muted-foreground relative text-sm">
          Verified by NIT Arunachal Pradesh
        </p>
      </aside>
      <main className="flex flex-col items-center justify-center gap-8 px-4 py-12">
        <Link href="/" className={`lg:hidden ${HOME_LINK}`}>
          <Wordmark compact />
        </Link>
        <div className="flex w-full max-w-md justify-center">{children}</div>
      </main>
    </div>
  );
}
