import { describe, expect, it } from "vitest";
import {
  duplicateKey,
  existingDuplicateKeys,
  mapLeadRow,
  parseCsv,
  parseLeadCsv,
  planImport,
} from "../../scripts/import-leads.mjs";

describe("lead CSV import helpers", () => {
  it("parses quoted commas, escaped quotes, and multiline fields", () => {
    expect(parseCsv('shop,notes\r\n"Shop, Inc.","A ""good"" lead\nfrom abroad"\r\n')).toEqual([
      ["shop", "notes"],
      ["Shop, Inc.", 'A "good" lead\nfrom abroad'],
    ]);
  });

  it("maps optional fields to null and uses the requested name fallback", () => {
    const lead = mapLeadRow({
      shop_name: "",
      email: "",
      phone: "",
      country: "Canada",
      city: "",
      state: "",
      address: "",
      website: "",
      send_email: "",
      notes: "",
    });

    expect(lead).toMatchObject({
      type: "wholesale",
      name: "Unknown Shop",
      company: null,
      email: null,
      phone: null,
      country: "Canada",
      city: null,
      state: null,
      address: null,
      website: null,
      message: "Imported Wholesale Lead | Send Email: Not provided | Notes: None",
    });
  });

  it("stores a shop name only in company and removes city when it duplicates country", () => {
    const lead = mapLeadRow({
      shop_name: "  Singapore Supply  ",
      country: "Singapore",
      city: " singapore ",
    });

    expect(lead).toMatchObject({
      name: "",
      company: "Singapore Supply",
      country: "Singapore",
      city: null,
    });
  });

  it("keeps a distinct city and compares fields case-insensitively after trimming", () => {
    const lead = mapLeadRow({
      shop_name: "FLORIDA OUTFITTERS",
      country: "Florida",
      city: "Miami",
    });

    expect(lead).toMatchObject({
      name: "",
      company: "FLORIDA OUTFITTERS",
      city: "Miami",
    });
  });

  it("matches headers by name and rejects malformed row widths", () => {
    const headers = "shop_name,country,city,state,address,email,phone,website,send_email,notes";
    expect(parseLeadCsv(`${headers}\nShop,Canada,,,,,,,,`).at(0)).toMatchObject({
      shop_name: "Shop",
      country: "Canada",
    });
    expect(() => parseLeadCsv(`${headers}\nShop,Canada`)).toThrow("has 2 columns; expected 10");
  });

  it("skips duplicates by email or by name and country", () => {
    const first = mapLeadRow({
      shop_name: "North Shop",
      country: "Canada",
      email: "Sales@Example.com",
    });
    const duplicateEmail = { ...first, name: "A different label" };
    const noEmail = mapLeadRow({
      shop_name: "North Shop",
      country: "Canada",
      email: "",
    });
    const existing = new Set([duplicateKey(first)!, duplicateKey(noEmail)!]);

    const plan = planImport([first, duplicateEmail, noEmail], existing);

    expect(plan).toMatchObject({
      toInsert: [],
      duplicateInFile: 1,
      duplicateInDatabase: 2,
      missingDuplicateKey: 0,
    });

    expect(planImport([noEmail], existingDuplicateKeys([first])).duplicateInDatabase).toBe(1);
  });

  it("does not deduplicate blank shop names by the generated fallback name", () => {
    const unknownShop = mapLeadRow({ shop_name: "", country: "Canada", email: "" });

    expect(planImport([unknownShop, unknownShop])).toMatchObject({
      toInsert: [unknownShop, unknownShop],
      duplicateInFile: 0,
      missingDuplicateKey: 2,
    });
  });
});
