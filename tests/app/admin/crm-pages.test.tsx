// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCrmLeads: vi.fn(),
  getCrmLeadCountries: vi.fn(),
  getCrmLeadStates: vi.fn(),
  getCrmLeadSummaryMetrics: vi.fn(),
  updateCrmLeadStatus: vi.fn(),
  bulkUpdateCrmLeadStatus: vi.fn(),
  getCrmLeadDetail: vi.fn(),
  createCrmInteraction: vi.fn(),
  updateCrmLeadNotes: vi.fn(),
  getCrmCustomers: vi.fn(),
  getCrmCustomerProfile: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/actions/crm", () => ({
  getCrmLeads: mocks.getCrmLeads,
  getCrmLeadCountries: mocks.getCrmLeadCountries,
  getCrmLeadStates: mocks.getCrmLeadStates,
  getCrmLeadSummaryMetrics: mocks.getCrmLeadSummaryMetrics,
  updateCrmLeadStatus: mocks.updateCrmLeadStatus,
  bulkUpdateCrmLeadStatus: mocks.bulkUpdateCrmLeadStatus,
  getCrmLeadDetail: mocks.getCrmLeadDetail,
  createCrmInteraction: mocks.createCrmInteraction,
  updateCrmLeadNotes: mocks.updateCrmLeadNotes,
  getCrmCustomers: mocks.getCrmCustomers,
  getCrmCustomerProfile: mocks.getCrmCustomerProfile,
}));
vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  useRouter: () => ({
    refresh: mocks.refresh,
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

import CrmCustomersPage from "@/app/admin/crm/customers/page";
import CrmCustomerDetailPage from "@/app/admin/crm/customers/[customerId]/page";
import CrmLeadsPage from "@/app/admin/crm/leads/page";

beforeEach(() => {
  mocks.getCrmLeads.mockResolvedValue({
    ok: true,
    leads: [],
    totalCount: 0,
    page: 1,
    totalPages: 0,
    nextCursor: null,
  });
  mocks.getCrmLeadCountries.mockResolvedValue(["Canada", "Singapore"]);
  mocks.getCrmLeadStates.mockResolvedValue(["Alberta", "Ontario"]);
  mocks.getCrmLeadSummaryMetrics.mockResolvedValue({
    ok: true,
    global: {
      totalCount: 0,
      countryDistribution: [],
      statusCounts: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, CONVERTED: 0, CLOSED: 0 },
      contactCoverage: { phoneCount: 0, phonePercent: 0, emailCount: 0, emailPercent: 0 },
    },
    scoped: {
      totalCount: 0,
      countryDistribution: [],
      statusCounts: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, CONVERTED: 0, CLOSED: 0 },
      contactCoverage: { phoneCount: 0, phonePercent: 0, emailCount: 0, emailPercent: 0 },
    },
  });
  mocks.updateCrmLeadStatus.mockResolvedValue({
    ok: true,
    lead: { id: "lead-1", status: "CONTACTED" },
    changed: true,
  });
  mocks.bulkUpdateCrmLeadStatus.mockResolvedValue({ ok: true, updatedCount: 1 });
  mocks.getCrmLeadDetail.mockResolvedValue({
    ok: true,
    lead: {
      id: "lead-1",
      type: "wholesale",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+1 555 0100",
      company: "Analytical Engines",
      country: "Canada",
      city: "Toronto",
      state: "Ontario",
      address: "100 Main Street",
      website: "example.com",
      message: "Interested in wholesale",
      notes: "Follow up next week",
      status: "NEW",
      createdAt: new Date("2026-10-13T12:00:00.000Z"),
      updatedAt: new Date("2026-10-13T12:00:00.000Z"),
      interactions: [
        {
          id: "interaction-1",
          type: "CALL",
          subject: "Introductory call",
          content: "Discussed the wholesale program.",
          occurredAt: new Date("2026-10-14T12:00:00.000Z"),
          author: { id: "admin-1", name: "Store Admin" },
        },
      ],
    },
  });
  mocks.createCrmInteraction.mockResolvedValue({
    ok: true,
    interaction: { id: "interaction-2", type: "NOTE", occurredAt: new Date() },
  });
  mocks.updateCrmLeadNotes.mockResolvedValue({
    ok: true,
    lead: { id: "lead-1", notes: "Updated internal note" },
  });
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
  it("normalizes lead filters and preserves them across pagination", async () => {
    mocks.getCrmLeads.mockResolvedValue({
      ok: true,
      leads: [
        {
          id: "lead-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: null,
          company: "Analytical Engines",
          country: "Canada",
          city: "Toronto",
          state: "Ontario",
          address: "100 Main Street",
          website: "example.com",
          message: "Imported lead notes",
          notes: "Call after the trade show",
          type: "GENERAL",
          status: "NEW",
          createdAt: new Date("2026-10-13T12:00:00.000Z"),
          updatedAt: new Date("2026-10-13T12:00:00.000Z"),
        },
      ],
      totalCount: 151,
      page: 3,
      totalPages: 4,
    });
    mocks.getCrmLeadSummaryMetrics.mockResolvedValue({
      ok: true,
      global: {
        totalCount: 151,
        countryDistribution: [{ country: "Canada", count: 82 }],
        statusCounts: { NEW: 82, CONTACTED: 30, QUALIFIED: 20, CONVERTED: 10, CLOSED: 9 },
        contactCoverage: {
          phoneCount: 120,
          phonePercent: 79.5,
          emailCount: 140,
          emailPercent: 92.7,
        },
      },
      scoped: {
        totalCount: 151,
        countryDistribution: [{ country: "Canada", count: 82 }],
        statusCounts: { NEW: 82, CONTACTED: 30, QUALIFIED: 20, CONVERTED: 10, CLOSED: 9 },
        contactCoverage: {
          phoneCount: 120,
          phonePercent: 79.5,
          emailCount: 140,
          emailPercent: 92.7,
        },
      },
    });

    const page = await CrmLeadsPage({
      searchParams: Promise.resolve({
        search: ["  ada  ", "ignored"],
        status: "NEW",
        country: " Canada ",
        state: " Ontario ",
        page: "3",
        limit: "50",
      }),
    });
    const { container } = render(page);

    expect(mocks.getCrmLeads).toHaveBeenCalledWith({
      search: "ada",
      status: "NEW",
      country: "Canada",
      state: "Ontario",
      page: 3,
      limit: 50,
    });
    expect(mocks.getCrmLeadSummaryMetrics).toHaveBeenCalledWith({
      search: "ada",
      status: "NEW",
      country: "Canada",
      state: "Ontario",
    });
    expect(mocks.getCrmLeadStates).toHaveBeenCalledWith("Canada");
    expect(screen.getByRole("heading", { name: "Leads" })).toBeInTheDocument();
    expect(screen.getByText("Total pipeline")).toBeInTheDocument();
    expect(screen.getByText("151")).toBeInTheDocument();
    expect(screen.getByText("All leads")).toBeInTheDocument();
    expect(screen.getByText("New: 82")).toBeInTheDocument();
    expect(screen.getByText("Phone coverage")).toBeInTheDocument();
    expect(screen.getByText("Email coverage")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search leads" })).toHaveValue("ada");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("NEW");
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveValue("Canada");
    expect(screen.getByRole("combobox", { name: "State / Province" })).toHaveValue("Ontario");
    expect(screen.getByRole("combobox", { name: "Page size" })).toHaveValue("50");
    expect(container.querySelector('input[name="page"]')).toHaveAttribute("value", "1");
    expect(screen.getByText("Toronto • Ontario")).toBeInTheDocument();
    expect(screen.getByText("100 Main Street")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "example.com" })).toHaveAttribute(
      "href",
      "https://example.com/",
    );
    expect(screen.getByText("GENERAL")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status for Ada Lovelace" })).toHaveValue("NEW");
    expect(screen.getByText("Imported lead notes")).toBeInTheDocument();
    const leadRow = screen.getByRole("row", { name: "Open lead details for Ada Lovelace" });
    const cells = leadRow.querySelectorAll("td");
    expect(cells[1]?.textContent).toContain("Analytical Engines");
    expect(cells[1]?.textContent).toContain("ada@example.com");
    expect(cells[1]?.textContent?.indexOf("Analytical Engines")).toBeLessThan(
      cells[1]?.textContent?.indexOf("ada@example.com") ?? -1,
    );
    expect(cells[2]?.textContent).toBe("—");
    expect(cells[3]?.textContent).toContain("Canada");
    expect(cells[3]?.textContent).toContain("Toronto • Ontario");
    expect(cells[4]?.textContent).toContain("100 Main Street");
    expect(cells[5]?.querySelector("span")?.textContent).toBe("GENERAL");
    expect(cells[6]?.querySelectorAll("details")).toHaveLength(1);
    expect(cells[6]?.querySelector("summary")?.textContent).toBe("View notes");
    expect(cells[6]?.textContent).toContain("Oct 13, 2026");
    expect(screen.getByText("Showing 101–150 of 151 leads · Page 3 of 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/admin/crm/leads?search=ada&status=NEW&country=Canada&state=Ontario&page=4&limit=50",
    );
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/admin/crm/leads?search=ada&status=NEW&country=Canada&state=Ontario&page=2&limit=50",
    );
    expect(screen.getByRole("link", { name: "Clear all filters" })).toHaveAttribute(
      "href",
      "/admin/crm/leads?page=1&limit=50",
    );
  });

  it("country badges apply that country while resetting page and preserving other filters", async () => {
    mocks.getCrmLeadSummaryMetrics.mockResolvedValue({
      ok: true,
      global: {
        totalCount: 5,
        countryDistribution: [
          { country: "Canada", count: 3 },
          { country: "Singapore", count: 2 },
        ],
        statusCounts: { NEW: 5, CONTACTED: 0, QUALIFIED: 0, CONVERTED: 0, CLOSED: 0 },
        contactCoverage: { phoneCount: 1, phonePercent: 20, emailCount: 4, emailPercent: 80 },
      },
      scoped: {
        totalCount: 5,
        countryDistribution: [
          { country: "Canada", count: 3 },
          { country: "Singapore", count: 2 },
        ],
        statusCounts: { NEW: 5, CONTACTED: 0, QUALIFIED: 0, CONVERTED: 0, CLOSED: 0 },
        contactCoverage: { phoneCount: 1, phonePercent: 20, emailCount: 4, emailPercent: 80 },
      },
    });

    const page = await CrmLeadsPage({
      searchParams: Promise.resolve({
        search: "north",
        status: "NEW",
        state: "Ontario",
        page: "4",
        limit: "50",
      }),
    });
    render(page);

    expect(screen.getByRole("link", { name: "Filter by Canada, 3 leads" })).toHaveAttribute(
      "href",
      "/admin/crm/leads?country=Canada&page=1&search=north&status=NEW&state=Ontario&limit=50",
    );
    expect(screen.getByRole("combobox", { name: "Page size" })).toHaveValue("50");
    expect(screen.getByRole("link", { name: "Clear all filters" })).toHaveAttribute(
      "href",
      "/admin/crm/leads?page=1&limit=50",
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

  it("selects rows, selects or clears the current page, and bulk-updates selected leads", async () => {
    const user = userEvent.setup();
    mocks.getCrmLeads.mockResolvedValue({
      ok: true,
      leads: [
        {
          id: "lead-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: "+1 555 0100",
          company: "Analytical Engines",
          country: "Canada",
          city: "Toronto",
          state: "Ontario",
          address: "100 Main Street",
          website: "example.com",
          message: "Interested in wholesale",
          notes: "Follow up next week",
          type: "wholesale",
          status: "NEW",
          createdAt: new Date("2026-10-13T12:00:00.000Z"),
          updatedAt: new Date("2026-10-13T12:00:00.000Z"),
        },
        {
          id: "lead-2",
          name: "Grace Hopper",
          email: "grace@example.com",
          phone: null,
          company: "Compiler Co",
          country: "USA",
          city: "Arlington",
          state: "Virginia",
          address: "200 Main Street",
          website: null,
          message: "Interested in a demo",
          notes: null,
          type: "contact",
          status: "QUALIFIED",
          createdAt: new Date("2026-10-12T12:00:00.000Z"),
          updatedAt: new Date("2026-10-12T12:00:00.000Z"),
        },
      ],
      totalCount: 2,
      page: 1,
      totalPages: 1,
    });

    const page = await CrmLeadsPage({ searchParams: Promise.resolve({}) });
    render(page);

    await user.click(screen.getByRole("checkbox", { name: "Select Ada Lovelace" }));
    expect(screen.getByText("1 lead selected")).toBeInTheDocument();
    expect(mocks.getCrmLeadDetail).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox", { name: "Select all leads on this page" }));
    expect(screen.getByText("2 leads selected")).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Bulk status" }), "CONTACTED");

    await waitFor(() => {
      expect(mocks.bulkUpdateCrmLeadStatus).toHaveBeenCalledWith({
        leadIds: ["lead-1", "lead-2"],
        status: "CONTACTED",
      });
      expect(screen.queryByText("2 leads selected")).not.toBeInTheDocument();
    });
    expect(mocks.refresh).toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: "Select all leads on this page" }));
    expect(screen.getByText("2 leads selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByText("2 leads selected")).not.toBeInTheDocument();
  });

  it("optimistically updates a lead status and reports server failures", async () => {
    const user = userEvent.setup();
    let resolveUpdate:
      | ((result: { ok: true; lead: { id: string; status: string }; changed: boolean }) => void)
      | undefined;
    mocks.updateCrmLeadStatus.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    mocks.getCrmLeads.mockResolvedValue({
      ok: true,
      leads: [
        {
          id: "lead-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: null,
          company: null,
          country: null,
          city: null,
          state: null,
          address: null,
          website: null,
          message: "",
          notes: null,
          type: "contact",
          status: "NEW",
          createdAt: new Date("2026-10-13T12:00:00.000Z"),
          updatedAt: new Date("2026-10-13T12:00:00.000Z"),
        },
      ],
      totalCount: 1,
      page: 1,
      totalPages: 1,
    });

    const page = await CrmLeadsPage({ searchParams: Promise.resolve({}) });
    render(page);
    const statusPicker = screen.getByRole("combobox", { name: "Status for Ada Lovelace" });

    await user.selectOptions(statusPicker, "CONTACTED");

    expect(statusPicker).toHaveValue("CONTACTED");
    expect(mocks.updateCrmLeadStatus).toHaveBeenCalledWith({
      leadId: "lead-1",
      status: "CONTACTED",
    });
    await act(async () => {
      resolveUpdate?.({ ok: true, lead: { id: "lead-1", status: "CONTACTED" }, changed: true });
    });
    expect(mocks.refresh).toHaveBeenCalled();

    mocks.updateCrmLeadStatus.mockResolvedValue({ ok: false, error: "Unable to update status." });
    await user.selectOptions(statusPicker, "QUALIFIED");
    expect(await screen.findAllByText("Unable to update status.")).toHaveLength(2);
  });

  it("copies lead details and renders direct telephone and email links", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    mocks.getCrmLeads.mockResolvedValue({
      ok: true,
      leads: [
        {
          id: "lead-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: "+1 555 0100",
          company: "Analytical Engines",
          country: "Canada",
          city: "Toronto",
          state: "Ontario",
          address: "100 Main Street",
          website: "example.com",
          message: "",
          notes: null,
          type: "wholesale",
          status: "NEW",
          createdAt: new Date("2026-10-13T12:00:00.000Z"),
          updatedAt: new Date("2026-10-13T12:00:00.000Z"),
        },
      ],
      totalCount: 1,
      page: 1,
      totalPages: 1,
    });

    const page = await CrmLeadsPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByRole("link", { name: "ada@example.com" })).toHaveAttribute(
      "href",
      "mailto:ada@example.com",
    );
    expect(screen.getByRole("link", { name: "+1 555 0100" })).toHaveAttribute(
      "href",
      "tel:+1 555 0100",
    );
    await user.click(screen.getByRole("button", { name: "Copy details for Ada Lovelace" }));

    expect(writeText).toHaveBeenCalledWith(
      [
        "Company: Analytical Engines",
        "Name: Ada Lovelace",
        "Phone: +1 555 0100",
        "Email: ada@example.com",
        "Location: Toronto, Ontario, Canada",
        "Address: 100 Main Street",
        "Website: example.com",
      ].join("\n"),
    );
    expect(await screen.findAllByText("Copied!")).toHaveLength(2);
  });

  it("opens the drawer from the lead URL, switches tabs, logs activity, and closes URL state", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/admin/crm/leads?page=2&limit=50&leadId=lead-1");
    mocks.getCrmLeads.mockResolvedValue({
      ok: true,
      leads: [
        {
          id: "lead-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: "+1 555 0100",
          company: "Analytical Engines",
          country: "Canada",
          city: "Toronto",
          state: "Ontario",
          address: "100 Main Street",
          website: "example.com",
          message: "Interested in wholesale",
          notes: "Follow up next week",
          type: "wholesale",
          status: "NEW",
          createdAt: new Date("2026-10-13T12:00:00.000Z"),
          updatedAt: new Date("2026-10-13T12:00:00.000Z"),
        },
      ],
      totalCount: 1,
      page: 2,
      totalPages: 2,
    });

    const page = await CrmLeadsPage({
      searchParams: Promise.resolve({ page: "2", limit: "50", leadId: "lead-1" }),
    });
    render(page);

    expect(mocks.getCrmLeadDetail).toHaveBeenCalledWith("lead-1");
    expect(
      screen.getByRole("dialog", { name: "Lead details: Analytical Engines" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Customer inquiry")).toHaveLength(2);
    expect(screen.getAllByText("Interested in wholesale")).toHaveLength(2);
    expect(screen.getByText("Internal admin notes")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Activity (1)" }));
    expect(screen.getByText("Discussed the wholesale program.")).toBeInTheDocument();
    expect(screen.getByText(/Store Admin · Oct 14, 2026/u)).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "Activity notes" }),
      "Sent pricing details.",
    );
    await user.click(screen.getByRole("button", { name: "Log activity" }));

    await waitFor(() => {
      expect(mocks.createCrmInteraction).toHaveBeenCalledWith({
        leadId: "lead-1",
        type: "NOTE",
        subject: "",
        content: "Sent pricing details.",
      });
    });
    expect(await screen.findByText("Activity logged.")).toBeInTheDocument();
    await waitFor(() => expect(mocks.getCrmLeadDetail).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole("button", { name: "Close lead details" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith("/admin/crm/leads?page=2&limit=50", {
      scroll: false,
    });

    await user.click(screen.getByRole("row", { name: "Open lead details for Ada Lovelace" }));
    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Lead details: Analytical Engines" }),
      ).toBeInTheDocument();
    });
    expect(mocks.push).toHaveBeenCalledWith("/admin/crm/leads?page=2&limit=50&leadId=lead-1", {
      scroll: false,
    });
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
