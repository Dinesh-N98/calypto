// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrmCustomerDetail } from "@/components/admin/CrmCustomerDetail";
import { CrmInteractionForm } from "@/components/admin/CrmInteractionForm";

const mocks = vi.hoisted(() => ({
  createCrmInteraction: vi.fn(),
}));

vi.mock("@/lib/actions/crm", () => ({ createCrmInteraction: mocks.createCrmInteraction }));

const emptyCustomer = {
  id: "customer-1",
  name: null,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: null,
  orders: [],
  crmInteractions: [],
};

beforeEach(() => {
  mocks.createCrmInteraction.mockResolvedValue({
    ok: true,
    interaction: { id: "interaction-1", type: "NOTE", occurredAt: new Date() },
  });
});

describe("CRM admin components", () => {
  it("shows safe profile information and explicit empty states without exposing unrelated fields", () => {
    render(<CrmCustomerDetail customer={emptyCustomer} />);

    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Not provided")).toBeInTheDocument();
    expect(screen.getByText("This customer has no linked orders.")).toBeInTheDocument();
    expect(screen.getByText("No interactions have been recorded.")).toBeInTheDocument();
    expect(screen.queryByText(/password|access.?token|session/i)).not.toBeInTheDocument();
  });

  it("renders linked order history and timeline entries", () => {
    render(
      <CrmCustomerDetail
        customer={{
          ...emptyCustomer,
          orders: [
            {
              id: "order-1",
              email: "ada@example.com",
              totalCents: 4500,
              currency: "USD",
              status: "paid",
              fulfillmentStatus: null,
              createdAt: new Date("2026-10-13T12:00:00.000Z"),
            },
          ],
          crmInteractions: [
            {
              id: "interaction-1",
              type: "CALL",
              subject: "Delivery update",
              content: "Customer asked about delivery.",
              occurredAt: new Date("2026-10-13T12:00:00.000Z"),
              author: { id: "admin-1", name: "Store Admin" },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("order-1")).toBeInTheDocument();
    expect(screen.getByText("$45.00")).toBeInTheDocument();
    expect(screen.getByText("Delivery update")).toBeInTheDocument();
    expect(screen.getByText("Customer asked about delivery.")).toBeInTheDocument();
    expect(screen.getByText("CALL · Store Admin")).toBeInTheDocument();
  });

  it("submits the selected interaction and resets the form on success", async () => {
    const user = userEvent.setup();
    render(<CrmInteractionForm customerId="customer-1" />);

    await user.selectOptions(screen.getByLabelText("Type"), "CALL");
    await user.type(screen.getByLabelText("Subject (optional)"), "Order follow-up");
    await user.type(screen.getByLabelText("Notes"), "Customer requested a callback.");
    await user.click(screen.getByRole("button", { name: "Add to timeline" }));

    await waitFor(() => {
      expect(mocks.createCrmInteraction).toHaveBeenCalledWith({
        customerId: "customer-1",
        subject: "Order follow-up",
        content: "Customer requested a callback.",
        type: "CALL",
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Interaction added.");
    expect(screen.getByLabelText("Subject (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Notes")).toHaveValue("");
  });

  it("shows a server validation error and preserves entered notes", async () => {
    mocks.createCrmInteraction.mockResolvedValue({
      ok: false,
      error: "Choose at least one customer, lead, or order.",
    });
    const user = userEvent.setup();
    render(<CrmInteractionForm customerId="customer-1" />);

    await user.type(screen.getByLabelText("Notes"), "Follow up next week.");
    await user.click(screen.getByRole("button", { name: "Add to timeline" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Choose at least one customer, lead, or order.",
    );
    expect(screen.getByLabelText("Notes")).toHaveValue("Follow up next week.");
  });
});
