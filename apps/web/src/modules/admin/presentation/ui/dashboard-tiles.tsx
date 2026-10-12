import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  Briefcase,
  Flag,
  HandCoins,
  MailWarning,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { MembersSummary } from "../../application/admin-store";
import type { DashboardTile } from "../../application/get-dashboard";
import type { TileKey } from "../../domain/access";

const TILE_COPY: Record<
  TileKey,
  { label: string; href: string; icon: LucideIcon }
> = {
  pendingVerifications: {
    label: "Verification requests pending",
    href: "/admin/verification",
    icon: UserCheck,
  },
  openReports: { label: "Open reports", href: "/admin/reports", icon: Flag },
  pendingJobs: {
    label: "Jobs awaiting review",
    href: "/admin/jobs",
    icon: Briefcase,
  },
  pendingAchievements: {
    label: "Achievements awaiting review",
    href: "/admin/achievements",
    icon: Award,
  },
  failedEmails: {
    label: "Failed notification emails",
    href: "/admin/notifications",
    icon: MailWarning,
  },
  pendingPledges: {
    label: "Pledges awaiting confirmation",
    href: "/admin/donations",
    icon: HandCoins,
  },
  members: { label: "Verified members", href: "/admin/users", icon: Users },
};

function StatusPill({ value }: { value: number }) {
  return value > 0 ? (
    <span className="text-brand inline-flex items-center gap-1.5 text-xs font-medium">
      <span className="bg-brand size-1.5 rounded-full" aria-hidden />
      Needs attention
    </span>
  ) : (
    <span className="text-muted-foreground text-xs">All clear</span>
  );
}

/** Label and icon on one line, the arrow appearing on hover: the tile's top row. */
function TileHead({ copy }: { copy: (typeof TILE_COPY)[TileKey] }) {
  const Icon = copy.icon;
  return (
    <div className="flex items-center gap-2">
      <Icon aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <p className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
        {copy.label}
      </p>
      <ArrowUpRight
        aria-hidden
        className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      />
    </div>
  );
}

function TileBody({ tile }: { tile: DashboardTile }) {
  const copy = TILE_COPY[tile.key];

  if (tile.status === "unavailable")
    return (
      <>
        <TileHead copy={copy} />
        <p className="text-muted-foreground mt-3 text-sm">Unavailable</p>
      </>
    );

  if (typeof tile.value === "number") {
    const value = tile.value;
    return (
      <>
        <TileHead copy={copy} />
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="font-display text-4xl leading-none font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          <StatusPill value={value} />
        </div>
      </>
    );
  }

  const m: MembersSummary = tile.value;
  return (
    <>
      <TileHead copy={copy} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="font-display text-4xl leading-none font-semibold tracking-tight tabular-nums">
          {m.byState.VERIFIED ?? 0}
        </p>
        <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
          <span>{m.byState.PENDING ?? 0} pending</span>
          <span>{m.byState.SUSPENDED ?? 0} suspended</span>
          <span className="text-brand font-medium">
            {m.newLast7Days} new this week
          </span>
        </p>
      </div>
    </>
  );
}

/** One card per tile the actor may act on. */
export function DashboardTiles({ tiles }: { tiles: DashboardTile[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tiles.map((tile) => {
        const copy = TILE_COPY[tile.key];
        return (
          <Link
            key={tile.key}
            href={copy.href}
            aria-label={copy.label}
            className={cn(
              "group bg-card hover:border-foreground/20 focus-visible:ring-ring rounded-xl border p-4 transition-colors duration-150 outline-none focus-visible:ring-2",
              tile.key === "members" && "sm:col-span-2"
            )}
          >
            <TileBody tile={tile} />
          </Link>
        );
      })}
    </div>
  );
}
