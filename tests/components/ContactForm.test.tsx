// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "@/components/ContactForm";

const toastMocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  cartItems: [
    {
      slug: "river-shad",
      variantId: "variant-1",
      sku: "SHAD-01",
      variantLabel: "Green / 4 in",
      name: "River Shad",
      priceCents: 1250,
      imageUrl: "/river-shad.webp",
      quantity: 2,
    },
  ],
}));
let gaMock: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;

vi.mock("@/components/CartProvider", () => ({
  useCart: () => ({ items: toastMocks.cartItems }),
}));
vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ showToast: toastMocks.showToast }),
}));

vi.mock("@/components/CustomerProfileProvider", () => ({
  useCustomerProfileAutofill: () => ({
    formRef: () => {},
    onChange: () => {},
    status: "unauthenticated",
  }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  window.location.hash = "";
  gaMock = vi.fn<(...args: unknown[]) => void>();
  window.gtag = gaMock;
  toastMocks.cartItems = [
    {
      slug: "river-shad",
      variantId: "variant-1",
      sku: "SHAD-01",
      variantLabel: "Green / 4 in",
      name: "River Shad",
      priceCents: 1250,
      imageUrl: "/river-shad.webp",
      quantity: 2,
    },
  ];
});

describe("ContactForm", () => {
  it("validates required fields and email before sending", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Message"), "Order question");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts valid contact details and confirms success", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Message"), "I have a question about my order.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ada Lovelace",
          email: "ada@example.com",
          message: "I have a question about my order.",
        }),
      });
      expect(toastMocks.showToast).toHaveBeenCalledWith("Message sent. We'll be in touch.");
    });
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it.each([
    ["#lead-source=cart", "cart"],
    ["#lead-source=buy_now", "buy_now"],
  ] as const)(
    "tracks a successful %s order inquiry without form data",
    async (hash, leadSource) => {
      const user = userEvent.setup();
      let resolveFetch!: (response: Response) => void;
      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      );
      window.location.hash = hash;
      const view = render(<ContactForm />);

      await user.type(screen.getByLabelText("Name"), "Private Name");
      await user.type(screen.getByLabelText("Email"), "private@example.test");
      await user.type(screen.getByLabelText("Message"), "Private order message");

      const form = screen.getByRole("button", { name: "Send message" }).closest("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);
      fireEvent.submit(form!);
      view.rerender(<ContactForm />);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(gaMock).not.toHaveBeenCalled();

      resolveFetch(
        new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await waitFor(() => expect(gaMock).toHaveBeenCalledTimes(1));
      expect(gaMock).toHaveBeenCalledWith(
        "event",
        "generate_lead",
        expect.objectContaining({
          lead_source: leadSource,
          currency: "USD",
          value: 25,
          items: [
            expect.objectContaining({
              item_id: "SHAD-01",
              item_name: "River Shad",
              item_variant: "Green / 4 in",
              price: 12.5,
              quantity: 2,
            }),
          ],
        }),
      );
      const eventPayload = JSON.stringify(gaMock.mock.calls);
      expect(eventPayload).not.toContain("Private Name");
      expect(eventPayload).not.toContain("private@example.test");
      expect(eventPayload).not.toContain("Private order message");
    },
  );

  it("tracks ordinary contact success without cart value or items", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Name"), "Contact Name");
    await user.type(screen.getByLabelText("Email"), "contact@example.test");
    await user.type(screen.getByLabelText("Message"), "A private contact message");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(gaMock).toHaveBeenCalledOnce());
    expect(gaMock).toHaveBeenCalledWith("event", "generate_lead", {
      lead_source: "contact",
    });
    const eventPayload = JSON.stringify(gaMock.mock.calls);
    expect(eventPayload).not.toContain("Contact Name");
    expect(eventPayload).not.toContain("contact@example.test");
    expect(eventPayload).not.toContain("A private contact message");
  });

  it("does not fail when consent is absent and gtag is unavailable", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    window.gtag = undefined;
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.test");
    await user.type(screen.getByLabelText("Message"), "Order question");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() =>
      expect(toastMocks.showToast).toHaveBeenCalledWith("Message sent. We'll be in touch."),
    );
  });

  it("shows the API validation error without clearing the form", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Email is invalid." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Message"), "Please help.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Email is invalid.")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toHaveValue("Please help.");
    expect(toastMocks.showToast).not.toHaveBeenCalled();
    expect(gaMock).not.toHaveBeenCalled();
  });

  it("does not track a rejected contact request", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValue(new Error("network unavailable"));
    render(<ContactForm />);

    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.test");
    await user.type(screen.getByLabelText("Message"), "Order question");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Unable to send your message. Please try again.")).toBeInTheDocument();
    expect(gaMock).not.toHaveBeenCalled();
  });
});
