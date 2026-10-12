import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EyeOff, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { Crest, Seal } from "@/components/brand/crest";
import { Ridgelines } from "@/components/brand/ridgelines";
import { PublicShell } from "@/components/common/public-shell";
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

const EYEBROW = "text-brand text-sm font-semibold";

const FACTS = [
  { term: "Established", detail: "2010" },
  { term: "Status", detail: "Institute of National Importance" },
  { term: "Campus", detail: "Jote, Papum Pare" },
  { term: "Membership", detail: "Verified by the institute" },
];

const MEMBERS = [
  {
    who: "Alumni",
    body: "Graduates of every programme and batch, wherever work has taken you.",
  },
  {
    who: "Students",
    body: "Currently enrolled students looking for mentors, internships and advice.",
  },
  {
    who: "Faculty",
    body: "Teachers who want to stay in touch with the students they taught.",
  },
  {
    who: "Staff",
    body: "Members of the institute who keep the campus running.",
  },
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

      <section className="relative isolate overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-[clamp(9rem,16vw,15rem)] sm:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:pt-24">
          <div>
            <Crest className="rise-in mb-6 w-16 lg:hidden" />
            <h1
              className="font-display rise-in text-[clamp(2.5rem,5.2vw,4.25rem)] leading-[1.04] font-semibold tracking-[-0.02em] text-balance"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Stay connected to the institute that shaped you.
            </h1>
            <p
              className="text-muted-foreground rise-in mt-6 max-w-[46ch] text-lg leading-relaxed text-pretty"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              One verified directory for the students, alumni, faculty and staff
              of NIT Arunachal Pradesh.
            </p>
            <div
              className="rise-in mt-9"
              style={{ "--i": 3 } as React.CSSProperties}
            >
              <CtaButtons signedIn={signedIn} />
            </div>
          </div>
          <div
            className="rise-in hidden justify-center lg:flex"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <Seal className="w-[clamp(16rem,26vw,22rem)]" />
          </div>
        </div>
        <Ridgelines className="absolute inset-x-0 bottom-0 -z-10 h-[clamp(8rem,17vw,16rem)]" />
      </section>

      <section
        aria-label="About the institute"
        className="border-border border-y"
      >
        <dl className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:px-8 lg:grid-cols-4">
          {FACTS.map(({ term, detail }, i) => (
            <div
              key={term}
              className={`border-border py-7 lg:py-9 ${i % 2 === 1 ? "border-l pl-5 sm:pl-8" : ""} ${i >= 2 ? "border-t lg:border-t-0" : ""} ${i === 2 ? "lg:border-l lg:pl-8" : ""}`}
            >
              <dt className="text-muted-foreground text-sm">{term}</dt>
              <dd className="font-display mt-1.5 text-lg font-semibold tracking-tight text-balance sm:text-xl">
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="pt-24 lg:pt-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl">
              Who can join
            </h2>
            <p className="text-muted-foreground mt-5 max-w-[42ch] text-lg leading-relaxed text-pretty">
              The network is open to anyone who studied or works at NIT
              Arunachal Pradesh. The institute checks every account before it
              can see the directory.
            </p>
          </div>
          <dl className="divide-border border-border divide-y border-y lg:col-span-7 lg:col-start-6">
            {MEMBERS.map(({ who, body }) => (
              <div
                key={who}
                className="grid gap-1 py-6 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8"
              >
                <dt className="font-display text-2xl font-semibold tracking-tight">
                  {who}
                </dt>
                <dd className="text-muted-foreground leading-relaxed sm:pt-1.5">
                  {body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Features signedIn={signedIn} />

      <section
        id="how-it-works"
        className="bg-muted/50 border-border scroll-mt-16 border-y py-24 lg:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            How it works
          </h2>
          <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            <span
              aria-hidden
              className="bg-border absolute top-5 right-[16%] left-5 hidden h-px md:block"
            />
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative flex gap-5 md:flex-col">
                <span className="bg-background border-primary text-primary font-display flex size-10 shrink-0 items-center justify-center rounded-full border text-lg font-semibold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-2xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground mt-1.5">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="privacy" className="scroll-mt-16 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <h2 className={EYEBROW}>A trusted network</h2>
          <p className="font-display mt-5 max-w-4xl text-3xl leading-[1.2] font-medium tracking-tight text-balance sm:text-4xl lg:text-[2.75rem]">
            Every member is verified by the institute. You choose who sees your
            profile, and your email, phone and roll number are{" "}
            <em className="text-brand">never shown</em> to other members.
          </p>
          <dl className="border-border mt-14 grid gap-px overflow-hidden rounded-lg border bg-[var(--border)] sm:grid-cols-3">
            {TRUST.map(({ icon: Icon, term, detail }) => (
              <div key={term} className="bg-background flex flex-col gap-4 p-6">
                <Icon aria-hidden className="text-brand size-5" />
                <div>
                  <dt className="text-muted-foreground text-sm">{term}</dt>
                  <dd className="mt-1 font-medium">{detail}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-muted/50 border-border border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-24">
          <div>
            <p className="font-display max-w-2xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl">
              Your batch is already here.
            </p>
            <p className="text-muted-foreground mt-4">
              Questions about membership?{" "}
              <Link
                href="/contact"
                className="text-foreground focus-visible:ring-ring rounded-sm underline decoration-from-font underline-offset-4 hover:decoration-2 focus-visible:ring-2 focus-visible:outline-none"
              >
                Write to the alumni office
              </Link>
              .
            </p>
          </div>
          <CtaButtons signedIn={signedIn} />
        </div>
      </section>
    </PublicShell>
  );
}
