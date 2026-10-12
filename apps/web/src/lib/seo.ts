import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

/** Pages anyone may land on from a search; app/sitemap.ts lists exactly these. */
export const INDEXABLE_PATHS = [
  "/",
  "/register",
  "/login",
  "/terms",
  "/contact",
] as const;

type IndexablePath = (typeof INDEXABLE_PATHS)[number];

/**
 * Metadata for an indexable public page: canonical URL plus Open Graph and
 * Twitter tags. Page-level `openGraph` replaces the root's rather than merging,
 * and app/opengraph-image.tsx only reaches pages that set none, so every field,
 * the image included, is set here.
 */
const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: siteConfig.name,
};

export function publicPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: IndexablePath;
}): Metadata {
  const isHome = path === "/";
  return {
    title: isHome ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: siteConfig.name,
      locale: "en_IN",
      type: "website",
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SHARE_IMAGE],
    },
  };
}

/**
 * For pages a search result should never point at: gated, token-bearing or
 * per-person.
 */
export const NO_INDEX: Metadata["robots"] = { index: false, follow: false };
