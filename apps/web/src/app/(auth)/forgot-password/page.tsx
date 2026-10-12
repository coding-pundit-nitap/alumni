import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard, ForgotPasswordForm } from "@/modules/auth";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Forgot your password",
  robots: NO_INDEX,
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we will send you a link to choose a new one."
      footer={
        <Link href="/login" className="text-foreground underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
