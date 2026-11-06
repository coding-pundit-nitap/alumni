"use client";

import { useEffect, useRef, useState } from "react";
import { CampusImage } from "@/components/brand/campus-image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { CAMPUS_PHOTOS } from "@/components/brand/campus-photos";

const SCENES = [
  {
    photo: CAMPUS_PHOTOS.hostelRoad,
    alt: "A long hostel block on a forested hillside, with the campus road winding past it.",
    headline: "You shared a hostel. Find them again.",
    panelSide: "md:ml-auto",
    items: [
      {
        title: "Directory",
        body: "Find batchmates by department, batch, company or city.",
      },
      {
        title: "Messages",
        body: "Direct and group conversations with the people you know.",
      },
    ],
  },
  {
    photo: CAMPUS_PHOTOS.domePanorama,
    alt: "The road climbing past the domed building towards the hostels, with forested hills behind.",
    headline: "Someone already took this road.",
    panelSide: "",
    items: [
      {
        title: "Mentorship",
        body: "Ask alumni who have walked the path before you.",
      },
      {
        title: "Jobs & internships",
        body: "Openings shared by alumni and reviewed before they go live.",
      },
    ],
  },
  {
    photo: CAMPUS_PHOTOS.domeAcademicAerial,
    alt: "The domed building and an academic block seen from above, with forest rising behind them.",
    headline: "There is always a reason to come back.",
    panelSide: "md:ml-auto",
    items: [
      {
        title: "Events",
        body: "Reunions, talks and meetups, on campus, online and in your city.",
      },
      {
        title: "Achievements",
        body: "Share milestones; the institute reviews them before they reach the feed.",
      },
    ],
  },
];

/**
 * What members can do, told over the campus: the photos stay pinned and
 * crossfade as each panel crosses the middle of the screen. Every item leads to
 * sign-up (or the app when signed in).
 */
export function Features({ signedIn }: { signedIn: boolean }) {
  const href = signedIn ? "/dashboard" : "/register";
  const [active, setActive] = useState(0);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setActive(sceneRefs.current.indexOf(entry.target as HTMLDivElement));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );
    for (const scene of sceneRefs.current) {
      if (scene) observer.observe(scene);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <section
      aria-label="What you can do"
      className="relative bg-[oklch(var(--ink))]"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="absolute inset-0">
          {SCENES.map(({ photo, alt }, i) => (
            <CampusImage
              photo={photo}
              key={photo.fallback}
              alt={i === active ? alt : ""}
              sizes="max(100vw, 178vh)"
              className={`story-photo object-cover ${i === active ? "is-active" : ""}`}
            />
          ))}
        </div>
      </div>

      <div className="relative -mt-[100svh]">
        {SCENES.map(({ photo, headline, panelSide, items }, i) => (
          <div
            key={photo.fallback}
            ref={(el) => {
              sceneRefs.current[i] = el;
            }}
            className="flex min-h-[125svh] items-end px-4 pb-6 sm:px-8 md:items-center md:pb-0"
          >
            <div className="mx-auto w-full max-w-7xl">
              <div
                className={`glass-panel w-full max-w-[30rem] rounded-3xl p-6 text-white sm:p-8 ${panelSide}`}
              >
                <h2 className="font-display text-[clamp(2rem,3.4vw,2.875rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-balance">
                  {headline}
                </h2>
                <ul className="mt-6 space-y-1">
                  {items.map(({ title, body }) => (
                    <li key={title}>
                      <Link
                        href={href}
                        className="group -mx-3 block rounded-2xl px-3 py-3 transition-[background-color,scale] duration-150 ease-out hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-lg font-semibold">{title}</h3>
                          <ArrowUpRight
                            aria-hidden
                            className="size-5 shrink-0 text-white/70 transition-[color,translate] duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                          />
                        </div>
                        <p className="mt-1 leading-relaxed text-white/85">
                          {body}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
