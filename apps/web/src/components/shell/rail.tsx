"use client";

import { Search } from "lucide-react";
import { CampusImage } from "@/components/brand/campus-image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@nitap/ui/components/tooltip";

import { CAMPUS_PHOTOS } from "@/components/brand/campus-photos";
import { Crest, Wordmark } from "@/components/brand/crest";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

import { openCommandPalette } from "./command-palette";
import { CreateMenu } from "./create-menu";
import type { ShellUser } from "./load-shell";
import { activeHref, NavIcon } from "./nav-icon";
import type { NavModel } from "./nav-model";
import { UserMenu } from "./user-menu";

const FOCUS = "focus-visible:ring-ring outline-none focus-visible:ring-2";

/**
 * Desktop/tablet rail: 248px with labels at lg, 72px icons with tooltips at md,
 * hidden below.
 */
export function Rail({
  nav,
  user,
  bell,
}: {
  nav: NavModel;
  user: ShellUser;
  bell: ReactNode;
}) {
  const pathname = usePathname();
  const active = activeHref(
    pathname,
    nav.groups.flatMap((g) => g.entries)
  );

  return (
    <aside className="glass-chrome sticky top-0 hidden h-svh shrink-0 flex-col md:flex md:w-[72px] lg:w-[248px]">
      <div className="flex flex-col gap-3 px-3 pt-4 pb-3 md:items-center lg:items-stretch">
        <Link
          href="/dashboard"
          aria-label={`${siteConfig.shortName} home`}
          className={cn("flex h-10 items-center rounded-md lg:px-2", FOCUS)}
        >
          <span className="hidden lg:block">
            <Wordmark compact />
          </span>
          <Crest className="lg:hidden" />
        </Link>
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Search"
          className={cn(
            "bg-background text-muted-foreground hover:text-foreground flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors duration-150 md:w-9 md:justify-center md:px-0 lg:w-full lg:justify-start lg:px-2.5",
            FOCUS
          )}
        >
          <Search aria-hidden="true" className="size-4" />
          <span className="hidden flex-1 text-left lg:inline">Search</span>
          <kbd className="bg-muted hidden rounded-full px-2 font-mono text-[11px] lg:inline">
            ⌘K
          </kbd>
        </button>
        <CreateMenu actions={nav.create} />
      </div>

      <nav
        aria-label="Primary"
        className="flex-1 scrollbar-none overflow-y-auto px-3 pb-4"
      >
        {nav.groups.map((group, i) => (
          <div key={group.label ?? i} className="mt-5 first:mt-1">
            {group.label && (
              <p className="text-muted-foreground/80 mb-1 hidden px-3 text-xs font-medium lg:block">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5 md:items-center lg:items-stretch">
              {group.entries.map((entry) => {
                const current = entry.href === active;
                return (
                  <li key={entry.href}>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Link
                            href={entry.href}
                            aria-current={current ? "page" : undefined}
                            className={cn(
                              "relative flex h-10 items-center gap-3 rounded-full px-3 text-[15px] transition-colors duration-150 md:w-10 md:justify-center md:px-0 lg:w-full lg:justify-start lg:px-3",
                              FOCUS,
                              current
                                ? "bg-brand/10 text-foreground font-semibold dark:bg-white/10"
                                : "text-foreground/70 hover:bg-muted hover:text-foreground"
                            )}
                          />
                        }
                      >
                        <NavIcon
                          name={entry.icon}
                          strokeWidth={current ? 2.25 : 1.75}
                          className={cn("size-5", current && "text-brand")}
                        />
                        <span className="sr-only lg:not-sr-only">
                          {entry.label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="lg:hidden">
                        {entry.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {nav.groups.some((g) =>
          g.entries.some((e) => e.href === "/donate")
        ) && <GiveBackCard />}
      </nav>

      <div className="flex flex-col items-center gap-1 p-3 lg:flex-row-reverse lg:items-center">
        {bell}
        <div className="min-w-0 lg:flex-1">
          <UserMenu user={user} variant="rail" />
        </div>
      </div>
    </aside>
  );
}

/**
 * The rail's one card, for members who can give: the campus itself, so it reads
 * as the institute asking rather than an ad. It ends the scrolling nav, so it
 * never covers an entry.
 */
function GiveBackCard() {
  return (
    <div className="mt-6 hidden lg:block">
      <div className="relative isolate overflow-hidden rounded-2xl bg-[oklch(var(--ink))] px-4 pt-14 pb-3.5 text-white">
        <CampusImage
          photo={CAMPUS_PHOTOS.domeAcademicAerial}
          alt=""
          sizes="224px"
          className="-z-10 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(var(--ink)/0.92)] via-[oklch(var(--ink)/0.65)] to-transparent"
        />
        <p className="font-display text-[1.05rem] leading-tight font-semibold">
          Give back to NIT AP
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/90">
          See the campaigns the alumni office is running this year.
        </p>
        <Link
          href="/donate"
          className={cn(
            "mt-3 inline-flex h-8 items-center rounded-full bg-white px-3.5 text-xs font-semibold text-[oklch(var(--ink))] transition-transform duration-150 ease-out active:scale-[0.97]",
            FOCUS
          )}
        >
          View campaigns
        </Link>
      </div>
    </div>
  );
}
