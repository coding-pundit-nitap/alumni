import type { Metadata } from "next";

import { AppShell } from "@/components/shell/app-shell";
import { NO_INDEX } from "@/lib/seo";

// Covers public member profiles too: they are reachable, but not for search engines.
export const metadata: Metadata = { robots: NO_INDEX };

/** Not an authorization boundary: pages keep their own redirects. */
export default function MemberLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
