// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCrmLeads: vi.fn(),
  getCrmCustomers: vi.fn(),
  getCrmCustomerProfile: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/actions/crm", () => ({
  getCrmLeads: mocks.getCrmLeads,
  getCrmCustomers: mocks.getCrmCustomers,
  getCrmCustomerProfile: mocks.getCrmCustomerProfile,
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

import CrmCustomersPage from "@/app/admin/crm/customers/page";
import CrmCustomerDetailPage from "@/app/admin/crm/customers/[customerId]/page";
import CrmLeadsPage from "@/app/admin/crm/leads/page";

beforeEach(() => {
  mocks.getCrmLeads.mockResolvedValue({ ok: true, leads: [], nextCursor: null });
  mocks.getCrmCustomers.mockResolvedValue({ ok: true, customers: [], nextCursor: null });
  mocks.getCrmCustomerProfile.mockResolvedValue({
    ok: true,
    customer: {
      id: "customer-1",
      name: "Ada Lovelace",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: null,
      orders: [],
      crmInteractions: [],
    },
  });
});

describe("CRM admin pages", () => {
  it("normalizes lead filters and preserves them in the next-page link", async () => {
    mocks.getCrmLeads.mockResolvedValue({
      ok: true,
      leads: [
        {
          id: "lead-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: null,
          company: null,
          type: "GENERAL",
          status: "NEW",
          createdAt: new Date("2026-10-13T12:00:00.000Z"),
          updatedAt: new Date("2026-10-13T12:00:00.000Z"),
        },
      ],
      nextCursor: "lead-1",
    });

    const page = await CrmLeadsPage({
      searchParams: Promise.resolve({
        search: ["  ada  ", "ignored"],
        status: "NEW",
        cursor: " lead-0 ",
      }),
    });
    render(page);

    expect(mocks.getCrmLeads).toHaveBeenCalledWith({
      search: "ada",
      status: "NEW",
      cursor: "lead-0",
    });
    expect(screen.getByRole("heading", { name: "Leads" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search leads" })).toHaveValue("ada");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("NEW");
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/admin/crm/leads?search=ada&status=NEW&cursor=lead-1",
    );
  });

  it("renders explicit empty states for lead and customer searches", async () => {
    const leadsPage = await CrmLeadsPage({
      searchParams: Promise.resolve({ search: "no-match" }),
    });
    const customersPage = await CrmCustomersPage({
      searchParams: Promise.resolve({ search: "no-match" }),
    });
    render(
      <>
        {leadsPage}
        {customersPage}
      </>,
    );

    expect(screen.getByText("No leads match these filters.")).toBeInTheDocument();
    expect(screen.getByText("No customers match this search.")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search customers" })).toHaveValue("no-match");
  });

  it("renders customer details for a valid profile and calls notFound for a missing profile", async () => {
    const page = await CrmCustomerDetailPage({
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const view = render(page);

    expect(mocks.getCrmCustomerProfile).toHaveBeenCalledWith("customer-1");
    expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(screen.getByText("This customer has no linked orders.")).toBeInTheDocument();
    expect(screen.getByText("No interactions have been recorded.")).toBeInTheDocument();
    view.unmount();

    mocks.getCrmCustomerProfile.mockResolvedValue({ ok: false, error: "Customer not found." });
    await expect(
      CrmCustomerDetailPage({ params: Promise.resolve({ customerId: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
