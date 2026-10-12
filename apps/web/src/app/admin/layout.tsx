import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminRail } from "@/components/admin/admin-rail";
import { adminNavigation, groupAdminNav } from "@/modules/admin";
import { can, getActor } from "@/modules/auth";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = { robots: NO_INDEX };

/**
 * Not a security boundary: every page authorizes through its own use case. This
 * only hides the shell (404) from anyone without an admin permission.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login?next=%2Fadmin");
  const items = adminNavigation((permission) => can(actor, permission));
  if (items.length === 0) notFound();

  return (
    // Same centred frame as the member shell, so moving between the two doesn't jump.
    <div className="mx-auto flex min-h-svh w-full max-w-[1240px] flex-col md:flex-row">
      <AdminRail groups={groupAdminNav(items)} />
      <main id="main" className="min-w-0 flex-1 md:border-r">
        <div className="px-4 pb-10 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
