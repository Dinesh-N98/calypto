// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownDescription } from "@/components/MarkdownDescription";

describe("MarkdownDescription", () => {
  it("renders headings, emphasis, links, and lists", () => {
    render(
      <MarkdownDescription
        description={
          "## Details\nA **durable** bait with *lifelike* action.\n- Soft plastic\n- [Shop](https://example.com)"
        }
      />,
    );

    expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByText("durable").tagName).toBe("STRONG");
    expect(screen.getByText("lifelike").tagName).toBe("EM");
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute(
      "href",
      "https://example.com/",
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("does not interpret raw HTML or unsafe link protocols", () => {
    render(
      <MarkdownDescription description={"<script>alert(1)</script> [unsafe](javascript:alert)"} />,
    );

    expect(screen.queryByRole("link", { name: "unsafe" })).not.toBeInTheDocument();
    expect(screen.getByText("<script>alert(1)</script> unsafe")).toBeInTheDocument();
  });
});
