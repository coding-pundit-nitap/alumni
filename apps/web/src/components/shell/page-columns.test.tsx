import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageColumns } from "./page-columns";

describe("PageColumns", () => {
  it("renders the header and the highlights rail when given", () => {
    render(
      <PageColumns header={<h1>Jobs</h1>} aside={<p>rail</p>}>
        body
      </PageColumns>
    );
    expect(screen.getByRole("banner")).toHaveTextContent("Jobs");
    expect(
      screen.getByRole("complementary", { name: "Highlights" })
    ).toHaveTextContent("rail");
  });

  it("lets a lone column fill the frame", () => {
    render(<PageColumns>body</PageColumns>);
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.getByText("body")).toHaveClass("flex-1");
    expect(screen.getByText("body").parentElement).not.toHaveClass(
      "justify-center"
    );
  });
});
