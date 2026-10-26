import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getGaCredentials } from "@/lib/ga-credentials";

const privateKey = [
  "-----BEGIN PRIVATE KEY-----",
  "test-private-key-material",
  "-----END PRIVATE KEY-----",
].join("\n");

function environment(GA_PRIVATE_KEY = privateKey) {
  return {
    GA_PROPERTY_ID: " 559941897 ",
    GA_CLIENT_EMAIL: " analytics@example.iam.gserviceaccount.com ",
    GA_PRIVATE_KEY,
  };
}

describe("GA4 credentials", () => {
  it("preserves real multiline PEM values and trims surrounding whitespace", () => {
    expect(
      getGaCredentials(environment(` \n"${privateKey}\n" \n`)),
    ).toEqual({
      clientEmail: "analytics@example.iam.gserviceaccount.com",
      privateKey,
      property: "properties/559941897",
    });
  });

  it("converts literal newline sequences in quoted PEM values", () => {
    const escapedKey = privateKey.replace(/\n/g, "\\n");

    expect(getGaCredentials(environment(`'${escapedKey}'`))).toEqual({
      clientEmail: "analytics@example.iam.gserviceaccount.com",
      privateKey,
      property: "properties/559941897",
    });
  });

  it("reports missing settings without exposing credential values", () => {
    expect(() =>
      getGaCredentials({
        GA_PROPERTY_ID: undefined,
        GA_CLIENT_EMAIL: undefined,
        GA_PRIVATE_KEY: undefined,
      }),
    ).toThrow("Missing: GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY.");
  });

  it("rejects a non-PEM key without including its contents in the error", () => {
    const secret = "sk_live_do_not_disclose";
    let errorMessage = "";

    try {
      getGaCredentials(environment(secret));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    expect(errorMessage).toContain("GA_PRIVATE_KEY must be a PEM-encoded private key");
    expect(errorMessage).not.toContain(secret);
  });

  it("requires a numeric GA4 property ID", () => {
    expect(() =>
      getGaCredentials({
        ...environment(),
        GA_PROPERTY_ID: "properties/559941897",
      }),
    ).toThrow("GA_PROPERTY_ID must be a numeric GA4 property ID.");
  });
});
