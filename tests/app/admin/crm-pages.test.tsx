// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCrmLeads: vi.fn(),
  getCrmLeadCountries: vi.fn(),
  getCrmCustomers: vi.fn(),
  getCrmCustomerProfile: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/actions/crm", () => ({
  getCrmLeads: mocks.getCrmLeads,
  getCrmLeadCountries: mocks.getCrmLeadCountries,
  getCrmCustomers: mocks.getCrmCustomers,
  getCrmCustomerProfile: mocks.getCrmCustomerProfile,
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

import CrmCustomersPage from "@/app/admin/crm/customers/page";
import CrmCustomerDetailPage from "@/app/admin/crm/customers/[customerId]/page";
import CrmLeadsPage from "@/app/admin/crm/leads/page";

beforeEach(() => {
  mocks.getCrmLeads.mockResolvedValue({ ok: true, leads: [], nextCursor: null });
  mocks.getCrmLeadCountries.mockResolvedValue(["Canada", "Singapore"]);
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
          country: "Canada",
          city: "Toronto",
          state: "Ontario",
          address: "100 Main Street",
          website: "example.com",
          message: "Imported lead notes",
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
        country: " Canada ",
        cursor: " lead-0 ",
      }),
    });
    render(page);

    expect(mocks.getCrmLeads).toHaveBeenCalledWith({
      search: "ada",
      status: "NEW",
      country: "Canada",
      cursor: "lead-0",
    });
    expect(screen.getByRole("heading", { name: "Leads" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search leads" })).toHaveValue("ada");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("NEW");
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveValue("Canada");
    expect(screen.getAllByText("Canada")).toHaveLength(2);
    expect(screen.getByText("Toronto • Ontario")).toBeInTheDocument();
    expect(screen.getByText("100 Main Street")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "example.com" })).toHaveAttribute(
      "href",
      "https://example.com/",
    );
    expect(screen.getByText("GENERAL")).toBeInTheDocument();
    expect(screen.getAllByText("New")).toHaveLength(2);
    expect(screen.getByText("Imported lead notes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/admin/crm/leads?search=ada&status=NEW&country=Canada&cursor=lead-1",
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

  it("shows an explicit placeholder for leads without email addresses", async () => {
    mocks.getCrmLeads.mockResolvedValue({
      ok: true,
      leads: [
        {
          id: "lead-no-email",
          name: "North Shop",
          email: null,
          phone: "+1 555 0100",
          company: "North Shop",
          country: "Canada",
          city: null,
          state: null,
          address: null,
          website: null,
          message: "Imported notes",
          type: "wholesale",
          status: "NEW",
          createdAt: new Date("2026-10-13T12:00:00.000Z"),
          updatedAt: new Date("2026-10-13T12:00:00.000Z"),
        },
      ],
      nextCursor: null,
    });

    const page = await CrmLeadsPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("No email provided")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "null" })).not.toBeInTheDocument();
  });

  it("does not render unsafe website values as external links", async () => {
    mocks.getCrmLeads.mockResolvedValue({
      ok: true,
      leads: [
        {
          id: "lead-unsafe-site",
          name: "Shop",
          email: null,
          phone: null,
          company: "Shop",
          country: "Thailand",
          city: null,
          state: null,
          address: null,
          website: "javascript:alert(1)",
          message: "",
          type: "wholesale",
          status: "NEW",
          createdAt: new Date("2026-10-13T12:00:00.000Z"),
          updatedAt: new Date("2026-10-13T12:00:00.000Z"),
        },
      ],
      nextCursor: null,
    });

    const page = await CrmLeadsPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "javascript:alert(1)" })).not.toBeInTheDocument();
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
