import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Segmented, segmentedItemVariants } from "./segmented";

describe("Segmented", () => {
  it("renders an outlined track and marks the active item in the brand colour", () => {
    render(
      <Segmented aria-label="View" className="extra">
        <a className={segmentedItemVariants({ active: true })}>Feed</a>
        <a className={segmentedItemVariants()}>People</a>
      </Segmented>
    );
    expect(screen.getByLabelText("View")).toHaveClass(
      "rounded-lg",
      "border",
      "extra"
    );
    expect(screen.getByText("Feed")).toHaveClass("text-brand", "inset-ring");
    expect(screen.getByText("People")).toHaveClass("text-muted-foreground");
  });
});
