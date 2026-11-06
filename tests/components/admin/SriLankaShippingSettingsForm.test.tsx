// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SriLankaShippingSettingsForm } from "@/components/admin/SriLankaShippingSettingsForm";

const initialRates = {
  underOneKgCents: 300,
  oneToThreeKgCents: 500,
  overThreeKgCents: 1_000,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("SriLankaShippingSettingsForm", () => {
  it("shows stored tiers and saves edited USD amounts as cents", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          rates: {
            underOneKgCents: 400,
            oneToThreeKgCents: 600,
            overThreeKgCents: 1_200,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SriLankaShippingSettingsForm initialRates={initialRates} />);

    expect(screen.getByLabelText(/Under 1 kg/u)).toHaveValue(3);
    expect(screen.getByLabelText(/1 kg to 3 kg/u)).toHaveValue(5);
    expect(screen.getByLabelText(/Over 3 kg/u)).toHaveValue(10);

    await user.clear(screen.getByLabelText(/Under 1 kg/u));
    await user.type(screen.getByLabelText(/Under 1 kg/u), "4");
    await user.clear(screen.getByLabelText(/1 kg to 3 kg/u));
    await user.type(screen.getByLabelText(/1 kg to 3 kg/u), "6");
    await user.clear(screen.getByLabelText(/Over 3 kg/u));
    await user.type(screen.getByLabelText(/Over 3 kg/u), "12");
    await user.click(screen.getByRole("button", { name: "Save shipping rates" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/shipping-rates",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          underOneKgCents: 400,
          oneToThreeKgCents: 600,
          overThreeKgCents: 1_200,
        }),
      }),
    );
    expect(await screen.findByText("Sri Lanka shipping rates saved.")).toBeInTheDocument();
  });
});
