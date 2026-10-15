import { describe, expect, it } from "vitest";
import { extractImportedNotes, planLeadCleanup } from "../../scripts/clean-lead-messages.mjs";

describe("lead message cleanup", () => {
  it("extracts imported notes and treats None as empty", () => {
    expect(
      extractImportedNotes("Imported Wholesale Lead | Send Email: yes | Notes: alternate phones"),
    ).toBe("alternate phones");
    expect(
      extractImportedNotes("Imported Wholesale Lead | Send Email: no | Notes: None"),
    ).toBeNull();
    expect(
      extractImportedNotes(
        "Imported Wholesale Lead | Send Email: yes | Notes: fly fishing | two locations",
      ),
    ).toBe("fly fishing | two locations");
  });

  it("plans changes only for imported wholesale leads", () => {
    const plan = planLeadCleanup([
      {
        id: "imported-with-notes",
        type: "wholesale",
        message: "Imported Wholesale Lead | Send Email: yes | Notes: fly fishing",
        notes: null,
      },
      {
        id: "imported-none",
        type: "wholesale",
        message: "Imported Wholesale Lead | Send Email: no | Notes: None",
        notes: "stale note",
      },
      {
        id: "customer-message",
        type: "contact",
        message: "Need 10000 units",
        notes: null,
      },
    ]);

    expect(plan).toEqual({
      updates: [
        { id: "imported-with-notes", notes: "fly fishing" },
        { id: "imported-none", notes: null },
      ],
      malformedMessages: 0,
    });
  });

  it("preserves existing notes and reports an imported message without a Notes marker", () => {
    expect(
      planLeadCleanup([
        {
          id: "malformed",
          type: "wholesale",
          message: "Imported Wholesale Lead | send_email=true",
          notes: "keep existing note",
        },
      ]),
    ).toEqual({
      updates: [{ id: "malformed", notes: "keep existing note" }],
      malformedMessages: 1,
    });
  });
});
