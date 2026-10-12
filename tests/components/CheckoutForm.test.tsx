// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
}: {
  currentProfile?: CheckoutProfile | null;
  addresses?: CheckoutAddress[];
  defaultAddress?: CheckoutAddress | null;
  isAuthenticated?: boolean;
} = {}) {
  return render(
    <CheckoutForm
      defaultAddress={defaultAddress}
      isAuthenticated={isAuthenticated}
      items={[{ variantId: "variant-1", quantity: 1 }]}
      paymentProvider="ONEPAY"
      paypalClientId=""
      profile={currentProfile}
      savedAddresses={addresses}
    />,
  );
}

describe("CheckoutForm", () => {
  it("renders server-provided contact details and default address immediately", () => {
    renderCheckout();

    expect(screen.getByLabelText("First name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Last name")).toHaveValue("Lovelace");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText(/Phone number/)).toHaveValue("+94771234567");
    expect(screen.getByLabelText("Street address")).toHaveValue("12 River Road");
    expect(screen.getByLabelText("Apartment, suite, etc. (optional)")).toHaveValue("Unit 4");
    expect(screen.getByLabelText("City")).toHaveValue("Colombo");
    expect(screen.getByLabelText("State / province")).toHaveValue("Western");
    expect(screen.getByLabelText("Delivery address")).toHaveValue("home");
  });

  it("does not overwrite a field edited before updated profile props arrive", async () => {
    const user = userEvent.setup();
    const view = renderCheckout({ currentProfile: null, addresses: [], isAuthenticated: false });

    await user.type(screen.getByLabelText("First name"), "Grace");
    view.rerender(
      <CheckoutForm
        defaultAddress={null}
        isAuthenticated={false}
        items={[{ variantId: "variant-1", quantity: 1 }]}
        paymentProvider="ONEPAY"
        paypalClientId=""
        profile={{ ...profile, firstName: "Ada" }}
        savedAddresses={[]}
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
    renderCheckout();
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
    renderCheckout({ currentProfile: null, addresses: [], isAuthenticated: false });

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
