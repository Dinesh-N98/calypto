// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  CheckoutForm,
  type CheckoutAddress,
  type CheckoutProfile,
} from "@/components/CheckoutForm";

vi.mock("@/components/PayPalCheckoutButtons", () => ({
  PayPalCheckoutButtons: () => <div data-testid="paypal-buttons" />,
}));

const profile: CheckoutProfile = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "+94771234567",
};

const savedAddresses: CheckoutAddress[] = [
  {
    id: "home",
    line1: "12 River Road",
    line2: "Unit 4",
    city: "Colombo",
    state: "Western",
    postalCode: "00100",
    country: "Sri Lanka",
    isDefault: true,
  },
  {
    id: "office",
    line1: "88 Ocean Avenue",
    line2: null,
    city: "Galle",
    state: "Southern",
    postalCode: "80000",
    country: "Sri Lanka",
    isDefault: false,
  },
];

function renderCheckout({
  currentProfile = profile,
  addresses = savedAddresses,
  defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null,
  isAuthenticated = true,
  paymentProvider = "ONEPAY",
  currentStep = 5,
  onShippingCostChange,
}: {
  currentProfile?: CheckoutProfile | null;
  addresses?: CheckoutAddress[];
  defaultAddress?: CheckoutAddress | null;
  isAuthenticated?: boolean;
  paymentProvider?: "ONEPAY" | "PAYPAL";
  currentStep?: 2 | 3 | 4 | 5;
  onShippingCostChange?: (shippingCents: number | null) => void;
} = {}) {
  return render(
    <StatefulCheckout
      defaultAddress={defaultAddress}
      currentStep={currentStep}
      isAuthenticated={isAuthenticated}
      items={[{ variantId: "variant-1", quantity: 1 }]}
      paymentProvider={paymentProvider}
      paypalClientId={paymentProvider === "PAYPAL" ? "test-client-id" : ""}
      profile={currentProfile}
      savedAddresses={addresses}
      onShippingCostChange={onShippingCostChange}
    />,
  );
}

function StatefulCheckout(props: ComponentProps<typeof CheckoutForm>) {
  const [step, setStep] = useState(props.currentStep ?? 5);
  return <CheckoutForm {...props} currentStep={step} onStepChange={setStep} />;
}

function stubCheckoutAndShippingFetch() {
  const fetchMock = vi.fn().mockImplementation((url: string) =>
    Promise.resolve(
      url === "/api/checkout/rates"
        ? new Response(
            JSON.stringify({
              rates: [
                {
                  serviceCode: "P",
                  serviceName: "DHL Express Domestic",
                  currency: "USD",
                  amount: 8.5,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          )
        : new Response(JSON.stringify({ error: "Checkout unavailable" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }),
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("CheckoutForm", () => {
  it("automatically quotes Sri Lankan delivery before allowing checkout to continue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            rates: [
              {
                serviceCode: "P",
                serviceName: "DHL Express Domestic",
                currency: "USD",
                amount: 8.5,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    renderCheckout({ currentStep: 3 });

    const continueButton = screen.getByRole("button", { name: "Continue to payment" });
    expect(continueButton).toBeDisabled();
    expect(
      screen.getByText(
        "Choose a DHL service. For Sri Lankan deliveries, a local rate is offered if DHL has no domestic service available.",
      ),
    ).toBeInTheDocument();

    expect(await screen.findByRole("radio", { name: "DHL Express Domestic" })).toBeChecked();
    expect(continueButton).toBeEnabled();
    expect(screen.getByText("USD 8.50")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Calculate shipping" })).not.toBeInTheDocument();
  });

  it("submits OnePay checkout with DHL shipping from the review step", async () => {
    const user = userEvent.setup();
    const fetchMock = stubCheckoutAndShippingFetch();
    renderCheckout({ currentStep: 3 });

    await screen.findByRole("radio", { name: "DHL Express Domestic" });
    await user.click(screen.getByRole("button", { name: "Continue to payment" }));
    await user.click(screen.getByRole("button", { name: "Review order" }));

    await user.click(screen.getByRole("button", { name: /Checkout/ }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/checkout/rates",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/checkout",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText("Checkout unavailable")).toBeInTheDocument();
  });

  it("shows a dynamic calling-code prefix and submits a normalized E.164 phone", async () => {
    const fetchMock = stubCheckoutAndShippingFetch();
    const { container } = renderCheckout({ currentStep: 2 });
    const callingCode = container.querySelector<HTMLSelectElement>('[aria-label="Calling code"]');
    const phoneInput = container.querySelector<HTMLInputElement>(
      '[aria-label="Phone number (E.164)"]',
    );
    expect(callingCode).not.toBeNull();
    expect(phoneInput).not.toBeNull();
    if (!callingCode || !phoneInput) throw new Error("Phone inputs were not rendered.");

    expect(phoneInput).toHaveValue("771234567");
    expect(phoneInput.parentElement).toHaveTextContent("(+94)");
    expect(phoneInput).toHaveAttribute("placeholder", "771234567");
    expect(phoneInput).toHaveStyle({ paddingLeft: "6rem" });

    fireEvent.change(callingCode, { target: { value: "+1" } });
    expect(phoneInput.parentElement).toHaveTextContent("(+1)");
    expect(phoneInput).toHaveValue("771234567");

    fireEvent.change(phoneInput, { target: { value: "202 555 0123" } });
    expect(phoneInput).toHaveValue("2025550123");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Continue to delivery" }));
    await screen.findByRole("radio", { name: "DHL Express Domestic" });
    await user.click(screen.getByRole("button", { name: "Continue to payment" }));
    await user.click(screen.getByRole("button", { name: "Review order" }));
    await user.click(screen.getByRole("button", { name: /Checkout/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const checkoutCall = fetchMock.mock.calls.find((call) => call[0] === "/api/checkout");
    if (!checkoutCall) throw new Error("OnePay checkout request was not sent.");
    const requestBody = JSON.parse(checkoutCall[1].body as string) as {
      customer: { phone: string };
    };
    expect(requestBody.customer.phone).toBe("+12025550123");
  });

  it("organizes checkout details into accessible sections", () => {
    renderCheckout({ currentStep: 2 });

    expect(screen.getByRole("group", { name: "Contact information" })).toBeInTheDocument();
    expect(
      screen.getByText("We'll use this to send your order confirmation and delivery updates."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Delivery address" })).not.toBeInTheDocument();
  });

  it("shows delivery address and shipping controls on the delivery step", () => {
    renderCheckout({ currentStep: 3 });

    expect(screen.getByRole("group", { name: "Delivery address" })).toBeInTheDocument();
    expect(screen.getByText("Where should we send your order?")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Contact information" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Calculate shipping" })).not.toBeInTheDocument();
  });

  it("debounces address changes and requotes when the cart changes", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            rates: [
              {
                serviceCode: "P",
                serviceName: "DHL Express Domestic",
                currency: "USD",
                amount: 8.5,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const props: ComponentProps<typeof CheckoutForm> = {
      defaultAddress: savedAddresses[0],
      currentStep: 3,
      isAuthenticated: true,
      items: [{ variantId: "variant-1", quantity: 1 }],
      paymentProvider: "ONEPAY",
      paypalClientId: "",
      profile,
      savedAddresses,
    };
    const view = render(<StatefulCheckout {...props} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("radio", { name: "DHL Express Domestic" })).toBeInTheDocument();

    const city = screen.getByLabelText("City");
    fireEvent.change(city, { target: { value: "Kandy" } });
    expect(screen.queryByRole("radio", { name: "DHL Express Domestic" })).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    fireEvent.change(city, { target: { value: "Jaffna" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    view.rerender(
      <StatefulCheckout
        {...props}
        items={[{ variantId: "variant-1", quantity: 2 }]}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("ignores a stale rate response after the delivery address changes", async () => {
    vi.useFakeTimers();
    let resolveFirstRequest!: (response: Response) => void;
    const firstRequest = new Promise<Response>((resolve) => {
      resolveFirstRequest = resolve;
    });
    const makeRateResponse = (serviceName: string) =>
      new Response(
        JSON.stringify({
          rates: [
            {
              serviceCode: "P",
              serviceName,
              currency: "USD",
              amount: 8.5,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstRequest)
      .mockResolvedValueOnce(makeRateResponse("New address rate"));
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout({ currentStep: 3 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Kandy" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("radio", { name: "New address rate" })).toBeInTheDocument();

    await act(async () => {
      resolveFirstRequest(makeRateResponse("Stale address rate"));
    });
    expect(screen.queryByRole("radio", { name: "Stale address rate" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "New address rate" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("requires a fresh DHL rate selection for international checkout", async () => {
    const user = userEvent.setup();
    const onShippingCostChange = vi.fn();
    const internationalAddress = {
      ...savedAddresses[0],
      city: "London",
      country: "United Kingdom",
      postalCode: "SW1A 1AA",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            rates: [
              {
                serviceCode: "P",
                serviceName: "DHL Express",
                currency: "USD",
                amount: 25,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    renderCheckout({
      addresses: [internationalAddress],
      defaultAddress: internationalAddress,
      currentStep: 3,
      onShippingCostChange,
    });

    const continueButton = screen.getByRole("button", { name: "Continue to payment" });
    expect(continueButton).toBeDisabled();

    expect(await screen.findByRole("option", { name: /DHL Express/ })).toBeInTheDocument();
    expect(continueButton).toBeEnabled();
    expect(screen.getByRole("radio", { name: "DHL Express" })).toBeChecked();
    expect(onShippingCostChange).toHaveBeenLastCalledWith(2500);
  });

  it.each(["ONEPAY", "PAYPAL"] as const)(
    "shows the legal links beside the %s payment action",
    (paymentProvider) => {
      renderCheckout({ paymentProvider, currentStep: 5 });

      expect(screen.getByText(/By placing your order, you agree to Calypto's/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
        "href",
        "/terms",
      );
      expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
        "href",
        "/privacy",
      );
      expect(screen.getByRole("link", { name: "Refund Policy" })).toHaveAttribute(
        "href",
        "/refund-policy",
      );
      if (paymentProvider === "ONEPAY") {
        expect(screen.getByRole("button", { name: /Checkout/ })).toHaveAttribute("type", "submit");
      } else {
        expect(screen.getByTestId("paypal-buttons")).toBeInTheDocument();
      }
    },
  );

  it("renders server-provided contact details and default address immediately", () => {
    renderCheckout({ currentStep: 3 });

    expect(screen.getByLabelText("First name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Last name")).toHaveValue("Lovelace");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Phone number (E.164)")).toHaveValue("771234567");
    expect(screen.getByLabelText("Phone number (E.164)").parentElement).toHaveTextContent("(+94)");
    expect(screen.getByLabelText("Street address")).toHaveValue("12 River Road");
    expect(screen.getByLabelText("Apartment, suite, etc. (optional)")).toHaveValue("Unit 4");
    expect(screen.getByLabelText("City")).toHaveValue("Colombo");
    expect(screen.getByLabelText("State / province")).toHaveValue("Western");
    expect(screen.getByLabelText("Delivery address")).toHaveValue("home");
  });

  it("does not overwrite a field edited before updated profile props arrive", async () => {
    const user = userEvent.setup();
    const view = renderCheckout({
      currentProfile: null,
      addresses: [],
      isAuthenticated: false,
      currentStep: 2,
    });

    await user.type(screen.getByLabelText("First name"), "Grace");
    view.rerender(
      <StatefulCheckout
        defaultAddress={null}
        isAuthenticated={false}
        items={[{ variantId: "variant-1", quantity: 1 }]}
        paymentProvider="ONEPAY"
        paypalClientId=""
        profile={{ ...profile, firstName: "Ada" }}
        savedAddresses={[]}
        currentStep={2}
      />,
    );

    expect(screen.getByLabelText("First name")).toHaveValue("Grace");
    await waitFor(() => {
      expect(screen.getByLabelText("Last name")).toHaveValue("Lovelace");
      expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    });
  });

  it("retains the new-address draft while switching between saved addresses", async () => {
    const user = userEvent.setup();
    renderCheckout({ currentStep: 3 });
    const addressSelector = screen.getByLabelText("Delivery address");
    const streetAddress = screen.getByLabelText("Street address");

    await user.clear(streetAddress);
    await user.type(streetAddress, "Edited River Road");
    await user.selectOptions(addressSelector, "new");
    expect(streetAddress).toHaveValue("");

    await user.type(streetAddress, "Draft Lake House");
    await user.selectOptions(addressSelector, "office");
    expect(streetAddress).toHaveValue("88 Ocean Avenue");
    expect(screen.getByLabelText("State / province")).toHaveValue("Southern");

    await user.selectOptions(addressSelector, "new");
    expect(streetAddress).toHaveValue("Draft Lake House");
    await user.selectOptions(addressSelector, "home");
    expect(streetAddress).toHaveValue("Edited River Road");
  });

  it("keeps guests blank and permits manual entry", async () => {
    const user = userEvent.setup();
    renderCheckout({ currentProfile: null, addresses: [], isAuthenticated: false, currentStep: 2 });

    expect(screen.getByLabelText("First name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Street address")).toHaveValue("");
    expect(screen.queryByLabelText("Delivery address")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("First name"), "Guest");
    await user.type(screen.getByLabelText("Street address"), "1 Guest Lane");
    expect(screen.getByLabelText("First name")).toHaveValue("Guest");
    expect(screen.getByLabelText("Street address")).toHaveValue("1 Guest Lane");
  });
});
