import type { CSSProperties } from "react";

/**
 * Far → near. Each ridge is hatched like a survey-map engraving; nearer ridges
 * are hatched closer and drift less on scroll.
 */
const RIDGES = [
  {
    d: "M0 190L80 165 150 178 240 120 310 150 390 92 460 136 540 112 615 84 690 150 745 132 830 70 900 124 980 102 1060 140 1140 92 1220 126 1300 106 1380 142 1440 126V400H0Z",
    gap: 7,
    opacity: 0.22,
    drift: "12%",
  },
  {
    d: "M0 250L90 220 170 240 260 186 340 230 420 200 520 242 600 210 720 262 840 204 930 230 1010 240 1110 192 1200 236 1290 204 1380 230 1440 214V400H0Z",
    gap: 5,
    opacity: 0.32,
    drift: "6%",
  },
  {
    d: "M0 318L110 288 200 312 300 272 400 308 480 282 580 318 680 286 780 322 880 282 980 312 1080 278 1180 318 1280 292 1440 314V400H0Z",
    gap: 3.5,
    opacity: 0.45,
    drift: "0%",
  },
];

/** Decorative engraved ridgelines that sit along the bottom of a section. */
export function Ridgelines({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`text-foreground pointer-events-none ${className ?? ""}`}
    >
      {RIDGES.map((r, i) => (
        <svg
          key={r.drift}
          viewBox="0 0 1440 400"
          preserveAspectRatio="none"
          className="ridge-parallax absolute inset-0 size-full"
          style={{ "--drift": r.drift } as CSSProperties}
        >
          <defs>
            <pattern
              id={`ridge-hatch-${i}`}
              width="8"
              height={r.gap}
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0.5"
                x2="8"
                y2="0.5"
                stroke="currentColor"
                strokeWidth="0.6"
                strokeOpacity={r.opacity * 0.5}
              />
            </pattern>
          </defs>
          {/* Opaque base so far ridges hide behind near ones. */}
          <path d={r.d} fill="var(--background)" />
          <path d={r.d} fill={`url(#ridge-hatch-${i})`} />
          <path
            d={r.d.replace("V400H0Z", "")}
            fill="none"
            stroke="currentColor"
            strokeOpacity={r.opacity}
            strokeWidth="1.25"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </div>
  );
}
