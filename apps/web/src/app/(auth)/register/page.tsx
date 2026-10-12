import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getActor } from "@/modules/auth";
import { AuthCard, RegisterForm } from "@/modules/auth";
import { publicPageMetadata } from "@/lib/seo";
import { verifiedHome } from "@/lib/signed-in-redirect";

export const metadata: Metadata = publicPageMetadata({
  title: "Create your account",
  description:
    "Join the NIT Arunachal Pradesh Alumni Network. Register with your email; the institute verifies every member.",
  path: "/register",
});

export default async function RegisterPage() {
  const actor = await getActor();
  const home = verifiedHome(actor);
  if (home) redirect(home);
  return (
    <AuthCard
      title="Create your account"
      description="Join the NIT Arunachal Pradesh alumni network."
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline">
            Sign in
          </Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
