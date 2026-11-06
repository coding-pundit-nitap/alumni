import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  PHOTO_PILL_GLASS,
  PHOTO_PILL_SOLID,
} from "@/components/common/photo-page";

export function CtaButtons({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <Link href="/dashboard" className={PHOTO_PILL_SOLID}>
        Go to dashboard
      </Link>
    );
  }
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Link href="/register" className={PHOTO_PILL_SOLID}>
        Join the network
        <ArrowRight aria-hidden className="size-4" />
      </Link>
      <Link href="/login" className={PHOTO_PILL_GLASS}>
        Log in
      </Link>
    </div>
  );
}
