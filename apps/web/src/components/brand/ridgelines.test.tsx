import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Ridgelines } from "./ridgelines";

describe("Ridgelines", () => {
  it("draws three ridges as decoration hidden from assistive tech", () => {
    const { container } = render(<Ridgelines />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("svg")).toHaveLength(3);
  });
});
