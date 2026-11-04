import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOnePayCheckout } from "@/lib/onepay";

describe("createOnePayCheckout", () => {
  beforeEach(() => {
    process.env.ONEPAY_APP_ID = "test-app";
    process.env.ONEPAY_APP_TOKEN = "test-token";
    process.env.ONEPAY_HASH_SALT = "test-salt";
    delete process.env.ONEPAY_SERVICE_ID;
  });

  it("reads the transaction identifier from the documented raw response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            redirect_url: "https://pay.onepay.lk/checkout/test",
            raw_response: {
              ipg_transaction_id: "WQBV118E584C83CBA50C6",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      createOnePayCheckout({
        appBaseUrl: "https://calyptobait.com",
        amountCents: 14327,
        customer: {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          phone: "+94771234567",
        },
        reference: "CAL-12345678901234567",
      }),
    ).resolves.toEqual({
      redirectUrl: "https://pay.onepay.lk/checkout/test",
      transactionId: "WQBV118E584C83CBA50C6",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.onepay.lk/v3/checkout/link/",
      expect.objectContaining({
        body: expect.stringContaining('"service_id":4'),
      }),
    );
  });

  it("reads the transaction identifier and redirect URL from OnePay data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 200,
            message: "Checkout link created",
            data: {
              ipg_transaction_id: "WQBV118E584C83CBA50C6",
              redirect_url: "https://pay.onepay.lk/checkout/data",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      createOnePayCheckout({
        appBaseUrl: "https://calyptobait.com",
        amountCents: 14327,
        customer: {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          phone: "+94771234567",
        },
        reference: "CAL-12345678901234567",
      }),
    ).resolves.toMatchObject({
      redirectUrl: "https://pay.onepay.lk/checkout/data",
      transactionId: "WQBV118E584C83CBA50C6",
    });
  });

  it("accepts a hosted payment URL alias from OnePay data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 200,
            message: "Checkout link created",
            data: {
              ipg_transaction_id: "WQBV118E584C83CBA50C6",
              checkout_url: "https://pay.onepay.lk/checkout/alias",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      createOnePayCheckout({
        appBaseUrl: "https://calyptobait.com",
        amountCents: 14327,
        customer: {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          phone: "+94771234567",
        },
        reference: "CAL-12345678901234567",
      }),
    ).resolves.toMatchObject({
      redirectUrl: "https://pay.onepay.lk/checkout/alias",
      transactionId: "WQBV118E584C83CBA50C6",
    });
  });

  it("extracts a hosted payment URL nested inside the gateway response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 200,
            message: "Successfully generate checkout link",
            data: {
              ipg_transaction_id: "RQIR1192DE6E88FA0E57B",
              amount: { value: 143.27, currency: "USD" },
              gateway: {
                checkout_url: "https://pay.onepay.lk/checkout/gateway",
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      createOnePayCheckout({
        appBaseUrl: "https://calyptobait.com",
        amountCents: 14327,
        customer: {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          phone: "+94771234567",
        },
        reference: "CAL-12345678901234567",
      }),
    ).resolves.toMatchObject({
      redirectUrl: "https://pay.onepay.lk/checkout/gateway",
      transactionId: "RQIR1192DE6E88FA0E57B",
    });
  });

  it("logs the complete parsed response when the checkout URL is missing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 200,
            message: "Checkout link created",
            data: { ipg_transaction_id: "WQBV118E584C83CBA50C6" },
            raw_response: { provider_status: "created" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      createOnePayCheckout({
        appBaseUrl: "https://calyptobait.com",
        amountCents: 14327,
        customer: {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          phone: "+94771234567",
        },
        reference: "CAL-12345678901234567",
      }),
    ).resolves.toMatchObject({
      redirectUrl: undefined,
      transactionId: "WQBV118E584C83CBA50C6",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "OnePay checkout response omitted its checkout URL.",
      {
        response: {
          status: 200,
          message: "Checkout link created",
          data: { ipg_transaction_id: "WQBV118E584C83CBA50C6" },
          raw_response: { provider_status: "created" },
        },
      },
    );
    consoleError.mockRestore();
  });
});
