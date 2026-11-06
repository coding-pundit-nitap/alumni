import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PILL =
  "inline-flex h-12 items-center gap-2 rounded-full px-7 text-base font-semibold whitespace-nowrap transition-[background-color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none active:scale-[0.97]";
const SOLID = `${PILL} bg-white text-[oklch(0.22_0.035_260)] hover:bg-white/90`;
const GLASS = `${PILL} glass-pill text-white`;

/** For use over photography: the colours stay fixed in both themes. */
export function CtaButtons({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <Link href="/dashboard" className={SOLID}>
        Go to dashboard
      </Link>
    );
  }
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Link href="/register" className={SOLID}>
        Join the network
        <ArrowRight aria-hidden className="size-4" />
      </Link>
      <Link href="/login" className={GLASS}>
        Log in
      </Link>
    </div>
  );
}
