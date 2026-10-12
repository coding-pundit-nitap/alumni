import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../lib/utils";

/**
 * Pill track for a small set of mutually exclusive links or buttons; style each
 * with `segmentedItemVariants`.
 */
function Segmented({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="segmented"
      className={cn(
        "bg-background inline-flex items-center gap-0.5 rounded-lg border p-0.5",
        className
      )}
      {...props}
    />
  );
}

const segmentedItemVariants = cva(
  "focus-visible:ring-ring inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold whitespace-nowrap transition-[color,background-color,box-shadow] duration-150 outline-none focus-visible:ring-2",
  {
    variants: {
      active: {
        true: "bg-brand/10 text-brand inset-ring-brand/45 inset-ring",
        false: "text-muted-foreground hover:bg-muted hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  }
);

export { Segmented, segmentedItemVariants };
