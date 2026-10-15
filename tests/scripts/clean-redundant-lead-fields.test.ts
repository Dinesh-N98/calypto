import { describe, expect, it } from "vitest";
import { planRedundantLeadCleanup } from "../../scripts/clean-redundant-lead-fields.mjs";

describe("redundant lead field cleanup", () => {
  it("clears matching names and cities after trimming and case folding", () => {
    expect(
      planRedundantLeadCleanup([
        {
          id: "both-fields",
          name: "  North Shop ",
          company: "north shop",
          city: " Singapore ",
          country: "SINGAPORE",
        },
      ]),
    ).toEqual({
      scanned: 1,
      namesCleared: 1,
      citiesCleared: 1,
      updates: [{ id: "both-fields", name: "", city: null }],
    });
  });

  it("leaves distinct fields and blank pairs unchanged", () => {
    expect(
      planRedundantLeadCleanup([
        { id: "distinct", name: "North Shop", company: "North Ltd", city: "Toronto", country: "Canada" },
        { id: "empty", name: "  ", company: " ", city: "", country: "" },
      ]),
    ).toEqual({
      scanned: 2,
      namesCleared: 0,
      citiesCleared: 0,
      updates: [],
    });
  });
});
