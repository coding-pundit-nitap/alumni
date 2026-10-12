import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * Only the public pages are worth crawling; everything else redirects a crawler
 * to /login. Member profiles are not disallowed here, because a disallowed URL
 * can still be indexed from links. They carry `noindex` instead, which a
 * crawler can only see if it is allowed to fetch the page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/storage/", "/health", "/metrics"],
    },
    sitemap: new URL("/sitemap.xml", siteConfig.url).toString(),
  };
}
