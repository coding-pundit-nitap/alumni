import type { Metadata } from "next";
import Image from "next/image";

import { CAMPUS_PHOTOS } from "@/components/brand/campus-photos";
import {
  PHOTO_PILL_GLASS,
  PHOTO_PILL_SOLID,
  PhotoPage,
} from "@/components/common/photo-page";
import { PublicShell } from "@/components/common/public-shell";
import { publicPageMetadata } from "@/lib/seo";
import { getActor } from "@/modules/auth";

export const metadata: Metadata = publicPageMetadata({
  title: "Developer",
  description:
    "Karan Kumar Sah designed and built the NIT Arunachal Pradesh Alumni Network for the NIT AP Coding Club.",
  path: "/developer",
});

const NAME = "Karan Kumar Sah";

const PROFILES = [
  { label: "GitHub", href: "https://github.com/krotrn" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/krotrn" },
  { label: "X", href: "https://x.com/krotrn" },
  { label: "Website", href: "https://krotrn.vercel.app" },
];

export default async function DeveloperPage() {
  const signedIn = (await getActor()) !== null;
  return (
    <PublicShell signedIn={signedIn}>
      <PhotoPage
        photo={CAMPUS_PHOTOS.academicBlocks}
        title={NAME}
        lead={
          <div className="rise-in mb-5 flex flex-col items-center gap-4">
            <Image
              src="/images/developer-portrait.webp"
              alt={`Illustrated portrait of ${NAME}`}
              width={112}
              height={112}
              preload
              className="size-28 rounded-full ring-2 ring-white/80"
            />
            <p className="text-sm font-semibold text-white [text-shadow:0_1px_10px_rgb(0_0_0/0.7)]">
              Developer, NIT AP Coding Club
            </p>
          </div>
        }
      >
        <p className="mt-4 max-w-md text-lg text-pretty text-white/90">
          CSE student at NIT Arunachal Pradesh. Designed and built this alumni
          network.
        </p>
        <nav
          aria-label="Contact the developer"
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <a href="mailto:krotrn.ks@gmail.com" className={PHOTO_PILL_SOLID}>
            Email
          </a>
          {PROFILES.map((profile) => (
            <a
              key={profile.label}
              href={profile.href}
              target="_blank"
              rel="noopener noreferrer"
              className={PHOTO_PILL_GLASS}
            >
              {profile.label}
            </a>
          ))}
        </nav>
      </PhotoPage>
    </PublicShell>
  );
}
