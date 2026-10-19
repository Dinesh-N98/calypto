// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ToastProvider";
import AdminOrdersError from "@/app/admin/orders/error";
import { OrdersDataTable } from "@/components/admin/orders/OrdersDataTable";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { OrdersSummaryCards } from "@/components/admin/orders/OrdersSummaryCards";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/orders",
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => vi.restoreAllMocks());

describe("admin order dashboard components", () => {
  it("renders payment and fulfillment statuses with clear labels", () => {
    render(
      <div>
        <OrderStatusBadge kind="payment" status="paid" />
        <OrderStatusBadge kind="fulfillment" status={null} />
      </div>,
    );

    expect(screen.getByText("PAID")).toBeInTheDocument();
    expect(screen.getByText("UNFULFILLED")).toBeInTheDocument();
  });

  it("shows zero-value metrics without combining revenue currencies", () => {
    render(
      <OrdersSummaryCards
        summary={{
          totalOrders: 0,
          pendingOrders: 0,
          shippedOrders: 0,
          unfulfilledOrders: 0,
          revenueByCurrency: [
            { currency: "USD", totalCents: 12500 },
            { currency: "LKR", totalCents: 250000 },
          ],
        }}
      />,
    );

    expect(screen.getByText("Total orders")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("LKR") && content.includes("2,500.00")),
    ).toBeInTheDocument();
    expect(screen.getByText("0 shipped · 0 unfulfilled")).toBeInTheDocument();
  });

  it("renders an informative empty state when filters match no orders", () => {
    render(
      <ToastProvider>
        <OrdersDataTable
          direction="desc"
          orders={[]}
          page={1}
          pageSize={10}
          sort="date"
          totalOrders={0}
          totalPages={1}
        />
      </ToastProvider>,
    );

    expect(screen.getByRole("heading", { name: "No orders found" })).toBeInTheDocument();
    expect(
      screen.getByText("Try adjusting the search or filters to see matching orders."),
    ).toBeInTheDocument();
  });

  it("renders the admin error boundary with a retry action", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<AdminOrdersError error={new Error("Database unavailable")} reset={reset} />);

    expect(screen.getByRole("heading", { name: "Orders could not be loaded" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    log.mockRestore();
  });

  it("keeps the order table horizontally scrollable at narrow widths", () => {
    render(
      <ToastProvider>
        <OrdersDataTable
          direction="desc"
          orders={[
            {
              id: "order-1",
              providerReference: "CAL-1001",
              email: "ada@example.com",
              customerFirstName: "Ada",
              customerLastName: "Lovelace",
              user: { name: null },
              status: "paid",
              fulfillmentStatus: null,
              carrier: null,
              trackingNumber: null,
              trackingUrl: null,
              paymentProvider: "ONEPAY",
              createdAt: new Date("2026-10-01T12:00:00.000Z"),
              totalCents: 12000,
              currency: "USD",
            },
          ]}
          page={1}
          pageSize={10}
          sort="date"
          totalOrders={1}
          totalPages={1}
        />
      </ToastProvider>,
    );

    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
  });
});
