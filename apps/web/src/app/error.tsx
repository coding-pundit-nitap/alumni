"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { CAMPUS_PHOTOS } from "@/components/brand/campus-photos";
import {
  PHOTO_PILL_GLASS,
  PHOTO_PILL_SOLID,
  PhotoPage,
} from "@/components/common/photo-page";
import { PublicShell } from "@/components/common/public-shell";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Server-side failures are already logged by instrumentation.ts (with this digest). This only
    // reaches the browser console until a client error tracker exists.
    console.error("Application runtime error:", error);
  }, [error]);

  return (
    <PublicShell signedIn={false}>
      <PhotoPage
        photo={CAMPUS_PHOTOS.domePanorama}
        title="Something went wrong"
      >
        <p className="mt-4 max-w-md text-lg text-pretty text-white/90">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-white/80">
            Reference: {error.digest}. Quote this if you contact support.
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className={PHOTO_PILL_SOLID}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className={PHOTO_PILL_GLASS}
          >
            Go to Homepage
          </button>
        </div>
      </PhotoPage>
    </PublicShell>
  );
}
