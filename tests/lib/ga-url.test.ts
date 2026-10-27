import { describe, expect, it } from "vitest";
import { buildGaPageUrl } from "@/lib/ga-url";

describe("buildGaPageUrl", () => {
  it("drops non-marketing query parameters and omits an empty query", () => {
    expect(
      buildGaPageUrl(
        "https://www.calyptobait.com",
        "/checkout/success",
        "?order=private-test-value&token=secret&email=test%40example.com",
      ),
    ).toEqual({
      pagePath: "/checkout/success",
      pageLocation: "https://www.calyptobait.com/checkout/success",
    });
  });

  it("keeps allowed marketing parameters and drops other values", () => {
    expect(
      buildGaPageUrl(
        "https://www.calyptobait.com",
        "/shop",
        "?utm_source=x&utm_campaign=y&order=1",
      ),
    ).toEqual({
      pagePath: "/shop?utm_source=x&utm_campaign=y",
      pageLocation:
        "https://www.calyptobait.com/shop?utm_source=x&utm_campaign=y",
    });
  });

  it("keeps all supported marketing click identifiers", () => {
    expect(
      buildGaPageUrl(
        "https://www.calyptobait.com",
        "/shop",
        "?utm_source=a&utm_medium=b&utm_campaign=c&utm_term=d&utm_content=e&gclid=f&fbclid=g",
      ).pagePath,
    ).toBe(
      "/shop?utm_source=a&utm_medium=b&utm_campaign=c&utm_term=d&utm_content=e&gclid=f&fbclid=g",
    );
  });
});
