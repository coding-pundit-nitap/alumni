"use client";

import { CampusImage } from "@/components/brand/campus-image";
import { usePathname } from "next/navigation";

import {
  CAMPUS_PHOTOS,
  type CampusPhoto,
} from "@/components/brand/campus-photos";

/** Each section opens on the part of campus that suits it. */
const SECTION_PHOTOS: Record<string, CampusPhoto> = {
  directory: CAMPUS_PHOTOS.hostelRoad,
  connections: CAMPUS_PHOTOS.hostelRoad,
  mentorship: CAMPUS_PHOTOS.domePanorama,
  jobs: CAMPUS_PHOTOS.academicBlocks,
  events: CAMPUS_PHOTOS.domeAcademicAerial,
  achievements: CAMPUS_PHOTOS.academicBlocks,
  donate: CAMPUS_PHOTOS.domePanorama,
  admin: CAMPUS_PHOTOS.academicBlocks,
};

/**
 * These already fill the top of the screen: Home has its own photo, Messages
 * its panes.
 */
const NO_BACKDROP = new Set(["dashboard", "messages"]);

/**
 * A campus photo across the top of the viewport, fading into the page, with the
 * glass chrome floating over it.
 */
export function CampusBackdrop() {
  const section = usePathname().split("/")[1] ?? "";
  if (NO_BACKDROP.has(section)) return null;
  return (
    <div
      aria-hidden
      className="campus-backdrop pointer-events-none absolute inset-x-0 top-0 -z-10 h-60"
    >
      <CampusImage
        photo={SECTION_PHOTOS[section] ?? CAMPUS_PHOTOS.hillsideAerial}
        priority
        alt=""
        sizes="100vw"
        className="object-cover object-[50%_40%]"
      />
    </div>
  );
}
