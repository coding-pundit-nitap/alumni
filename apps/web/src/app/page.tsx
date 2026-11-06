import type { Metadata } from "next";
import { CampusImage } from "@/components/brand/campus-image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EyeOff, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { PublicShell } from "@/components/common/public-shell";
import { CAMPUS_PHOTOS } from "@/components/brand/campus-photos";
import { siteConfig } from "@/config/site";
import { getActor } from "@/modules/auth";
import { publicPageMetadata } from "@/lib/seo";
import { verifiedHome } from "@/lib/signed-in-redirect";

import { CtaButtons } from "./_landing/cta-buttons";
import { Features } from "./_landing/features";

export const metadata: Metadata = publicPageMetadata({
  title: siteConfig.name,
  description: siteConfig.description,
  path: "/",
});

const STATEMENT =
  "You came to Arunachal for a degree and left with a batch. Alumni, students, faculty and staff, back in one place, with every account checked by the institute.".split(
    " "
  );

const FACTS = [
  { term: "Established", detail: "2010" },
  { term: "Status", detail: "Institute of National Importance" },
  { term: "Campus", detail: "Jote, Papum Pare" },
  { term: "Membership", detail: "Verified by the institute" },
];

const STEPS = [
  { title: "Register", body: "Sign up with your email." },
  {
    title: "Get verified",
    body: "The institute confirms you studied or work here.",
  },
  { title: "Connect", body: "Reach people, mentors and opportunities." },
] as const;

const TRUST = [
  { icon: ShieldCheck, term: "Accounts", detail: "Institute-verified" },
  {
    icon: SlidersHorizontal,
    term: "Your profile",
    detail: "Per-field visibility controls",
  },
  { icon: EyeOff, term: "Contact details", detail: "Never shown to members" },
];

/**
 * Anyone may view; VERIFIED visitors go to the app, other signed-in states see
 * "Go to dashboard".
 */
// `<` escaped so no string here can close the script element.
const ORGANIZATION_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  alternateName: siteConfig.shortName,
  url: siteConfig.url,
  logo: new URL("/icon-512.png", siteConfig.url).toString(),
  description: siteConfig.description,
  parentOrganization: {
    "@type": "CollegeOrUniversity",
    name: "National Institute of Technology Arunachal Pradesh",
  },
}).replace(/</g, "\\u003c");

export default async function LandingPage() {
  const actor = await getActor();
  const home = verifiedHome(actor);
  if (home) redirect(home);
  const signedIn = actor !== null;
  return (
    <PublicShell signedIn={signedIn}>
      {/* nosemgrep: nitap-dangerously-set-inner-html — constant JSON-LD from site config; a data block, so CSP does not run it. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ORGANIZATION_JSON_LD }}
      />

      {/* Pulled up under the sticky header; the top strip keeps its 2.25rem. */}
      <section className="relative isolate -mt-[4.25rem] flex min-h-[calc(100svh-2.25rem)] overflow-hidden bg-[oklch(var(--ink))]">
        <div className="hero-photo absolute inset-0 -z-10 origin-[50%_55%]">
          <CampusImage
            photo={CAMPUS_PHOTOS.academicBlocks}
            priority
            alt="The academic blocks of NIT Arunachal Pradesh under a wide blue sky, with forested hills behind them."
            sizes="max(100vw, 178vh)"
            className="object-cover object-top"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[oklch(var(--ink)/0.5)] via-transparent via-40% to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-[oklch(var(--ink)/0.82)] to-transparent"
        />
        {/* Headline in the sky, action on the field: the buildings stay clear. */}
        <div className="hero-copy mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-8 px-4 pt-[calc(4.25rem+clamp(1.5rem,5vh,3.5rem))] pb-[clamp(1.5rem,5vh,3rem)] text-center text-white sm:px-8">
          <h1
            className="font-display rise-in text-[clamp(2.75rem,min(5.6vw,11vh),5.75rem)] leading-[1.04] font-semibold tracking-[-0.025em] text-balance"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Stay connected to the institute that shaped you.
          </h1>
          <div className="flex flex-col items-center">
            <p
              className="rise-in max-w-[62ch] text-lg leading-relaxed text-pretty sm:text-xl"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              One verified directory for the students, alumni, faculty and staff
              of NIT Arunachal Pradesh.
            </p>
            <div
              className="rise-in mt-6"
              style={{ "--i": 3 } as React.CSSProperties}
            >
              <CtaButtons signedIn={signedIn} />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="who-can-join"
        className="px-4 pt-32 pb-24 sm:px-8 lg:pt-48 lg:pb-32"
      >
        <div className="mx-auto max-w-5xl">
          <h2 id="who-can-join" className="text-brand text-lg font-semibold">
            Who can join
          </h2>
          <p className="word-reveal font-display mt-6 text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.1] font-semibold tracking-[-0.02em]">
            {STATEMENT.map((word, i) => (
              <span
                key={i}
                style={
                  {
                    "--p": i / (STATEMENT.length - 1),
                  } as React.CSSProperties
                }
              >
                {word}{" "}
              </span>
            ))}
          </p>
          <dl className="mt-20 grid grid-cols-2 gap-x-8 gap-y-10 lg:mt-28 lg:grid-cols-4">
            {FACTS.map(({ term, detail }) => (
              <div key={term}>
                <dt className="text-muted-foreground text-sm">{term}</dt>
                <dd className="font-display mt-1.5 text-xl font-semibold tracking-tight text-balance">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Features signedIn={signedIn} />

      <section
        id="how-it-works"
        className="scroll-mt-16 px-4 pt-32 pb-24 sm:px-8 lg:pt-44 lg:pb-32"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.08] font-semibold tracking-[-0.02em]">
            How it works
          </h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-12">
            {STEPS.map(({ title, body }) => (
              <li key={title}>
                <h3 className="font-display text-3xl font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-2 text-lg leading-relaxed text-pretty">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="privacy"
        className="scroll-mt-16 px-4 pt-16 pb-32 sm:px-8 lg:pb-44"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance">
            Your email, phone and roll number are{" "}
            <em className="text-brand pb-1">never shown</em> to other members.
          </h2>
          <p className="text-muted-foreground mt-6 max-w-[52ch] text-lg leading-relaxed text-pretty">
            Every member is verified by the institute, and you choose who sees
            your profile.
          </p>
          <dl className="mt-14 grid gap-8 sm:grid-cols-3">
            {TRUST.map(({ icon: Icon, term, detail }) => (
              <div key={term}>
                <Icon aria-hidden className="text-brand size-6" />
                <dt className="text-muted-foreground mt-4 text-sm">{term}</dt>
                <dd className="mt-1 text-lg font-medium">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="relative isolate flex min-h-svh items-end justify-center overflow-hidden px-4 pt-24 pb-[clamp(2.5rem,8vh,5rem)] text-center text-white sm:px-8">
        <div className="photo-open absolute inset-0 -z-10 bg-[oklch(var(--ink))]">
          <CampusImage
            photo={CAMPUS_PHOTOS.hillsideAerial}
            alt="The campus from the air: the domed building and long blocks strung along one road through the forest."
            sizes="max(100vw, 178vh)"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[oklch(var(--ink)/0.92)] via-[oklch(var(--ink)/0.55)] via-40% to-transparent to-75%"
          />
        </div>
        <div className="flex flex-col items-center">
          <p className="font-display text-[clamp(2.75rem,7vw,6.25rem)] leading-[1.04] font-semibold tracking-[-0.025em] text-balance">
            Your batch is already here.
          </p>
          <div className="mt-9">
            <CtaButtons signedIn={signedIn} />
          </div>
          <p className="mt-7 text-white/90">
            Questions about membership?{" "}
            <Link
              href="/contact"
              className="rounded-sm underline decoration-from-font underline-offset-4 hover:decoration-2 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Write to the alumni office
            </Link>
            .
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
