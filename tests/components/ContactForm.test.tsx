// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "@/components/ContactForm";

const toastMocks = vi.hoisted(() => ({ showToast: vi.fn() }));

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
  });
});
