import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Check } from "lucide-react";

const CHIP =
  "border-border text-muted-foreground rounded-sm border px-2 py-0.5 font-mono text-[11px]";

type Feature = {
  title: string;
  body: string;
  detail: ReactNode;
  /** Columns out of six at lg. */
  span: string;
  tinted?: boolean;
};

const FEATURES: Feature[] = [
  {
    title: "Directory",
    body: "Find batchmates by department, batch, company or city.",
    span: "lg:col-span-4",
    tinted: true,
    detail: (
      <div className="flex -space-x-2">
        {["TL", "RD", "NB", "PK", "YT"].map((i) => (
          <span
            key={i}
            className="bg-background border-border text-foreground flex size-9 items-center justify-center rounded-md border text-[11px] font-semibold"
          >
            {i}
          </span>
        ))}
      </div>
    ),
  },
  {
    title: "Mentorship",
    body: "Ask alumni who have walked the path before you.",
    span: "lg:col-span-2",
    detail: <span className={CHIP}>ECE 2016 to ECE 2027</span>,
  },
  {
    title: "Jobs & internships",
    body: "Openings shared by alumni and reviewed before they go live.",
    span: "lg:col-span-2",
    detail: (
      <span className="text-success border-success/30 flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[11px]">
        <Check aria-hidden className="size-3" /> Reviewed
      </span>
    ),
  },
  {
    title: "Events",
    body: "Reunions, talks and meetups, on campus, online and in your city.",
    span: "lg:col-span-4",
    tinted: true,
    detail: (
      <span className="bg-background border-border flex flex-col items-center rounded-md border px-3 py-1.5 leading-none">
        <span className="text-brand font-mono text-[10px] tracking-widest">
          SAT
        </span>
        <span className="font-display mt-0.5 text-2xl font-semibold">14</span>
      </span>
    ),
  },
  {
    title: "Messages",
    body: "Direct and group conversations with the people you know.",
    span: "lg:col-span-3",
    detail: (
      <span className="flex flex-col items-start gap-1">
        <span className="bg-muted rounded-md rounded-bl-sm px-2.5 py-1 text-[11px]">
          In Itanagar this weekend?
        </span>
        <span className="bg-primary text-primary-foreground self-end rounded-md rounded-br-sm px-2.5 py-1 text-[11px]">
          Saturday works.
        </span>
      </span>
    ),
  },
  {
    title: "Achievements",
    body: "Share milestones; the institute reviews them before they reach the feed.",
    span: "lg:col-span-3",
    detail: <span className={CHIP}>Institute-reviewed</span>,
  },
];

/**
 * What members can do, as a hairline grid of uneven tiles; every tile leads to
 * sign-up (or the app when signed in).
 */
export function Features({ signedIn }: { signedIn: boolean }) {
  const href = signedIn ? "/dashboard" : "/register";
  return (
    <section aria-label="What you can do" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <h2 className="font-display max-w-2xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl">
          Everything the network does for you
        </h2>
        <p className="text-muted-foreground mt-5 max-w-[60ch] text-lg text-pretty">
          Verified once by the institute. After that, six ways back to the
          people you studied and worked with.
        </p>

        <ul className="border-border mt-14 grid border-t border-l sm:grid-cols-2 lg:grid-cols-6">
          {FEATURES.map(({ title, body, detail, span, tinted }) => (
            <li
              key={title}
              className={`border-border border-r border-b ${span}`}
            >
              <Link
                href={href}
                className={`group focus-visible:ring-ring flex h-full min-h-56 flex-col justify-between gap-10 p-6 transition-colors duration-200 hover:bg-muted/70 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:p-8 ${tinted ? "bg-muted/40" : ""}`}
              >
                <div aria-hidden className="flex min-h-10 items-start">
                  {detail}
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                      {title}
                    </h3>
                    <ArrowUpRight
                      aria-hidden
                      className="text-muted-foreground group-hover:text-brand size-5 shrink-0 transition-[color,translate] duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </div>
                  <p className="text-muted-foreground mt-2 max-w-[44ch] leading-relaxed">
                    {body}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
