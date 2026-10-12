import { buttonVariants } from "@nitap/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AuthCard,
  SignOutButton,
  accountStatusCopy,
  getActor,
} from "@/modules/auth";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Account status",
  robots: NO_INDEX,
};

export default async function AccountStatusPage() {
  const actor = await getActor();
  if (!actor) redirect("/login?next=%2Faccount%2Fstatus");

  const copy = accountStatusCopy(actor.accountState);
  if (!copy) redirect("/");

  return (
    <AuthCard title={copy.title} description={copy.body}>
      {actor.accountState === "PENDING" || actor.accountState === "REJECTED" ? (
        <Link href="/onboarding" className={buttonVariants()}>
          Verify your affiliation
        </Link>
      ) : null}
      <SignOutButton />
    </AuthCard>
  );
}
