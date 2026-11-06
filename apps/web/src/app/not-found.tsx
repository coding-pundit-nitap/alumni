import Link from "next/link";

import { CAMPUS_PHOTOS } from "@/components/brand/campus-photos";
import { PublicShell } from "@/components/common/public-shell";
import { PHOTO_PILL_SOLID, PhotoPage } from "@/components/common/photo-page";

export default function NotFound() {
  return (
    <PublicShell signedIn={false}>
      <PhotoPage photo={CAMPUS_PHOTOS.crescentAerial} title="Page not found">
        <p className="mt-4 max-w-md text-lg text-pretty text-white/90">
          The page you are looking for does not exist or might have been moved.
        </p>
        <Link href="/" className={`${PHOTO_PILL_SOLID} mt-8`}>
          Return to Homepage
        </Link>
      </PhotoPage>
    </PublicShell>
  );
}
