"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createCrmInteraction } from "@/lib/actions/crm";

type CrmInteractionFormProps = {
  customerId: string;
};

export function CrmInteractionForm({ customerId }: CrmInteractionFormProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage("");
    const subject = String(formData.get("subject") ?? "");
    const content = String(formData.get("content") ?? "");
    const type = String(formData.get("type") ?? "NOTE");

    startTransition(async () => {
      const result = await createCrmInteraction({ customerId, subject, content, type });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Interaction added.");
      const form = document.getElementById("crm-interaction-form");
      if (form instanceof HTMLFormElement) form.reset();
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(new FormData(event.currentTarget));
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-black/10 bg-white p-5 shadow-sm"
      id="crm-interaction-form"
      onSubmit={handleSubmit}
    >
      <h2 className="text-lg font-bold">Add interaction</h2>
      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <label className="text-xs font-bold text-[#55594f]">
          Type
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-black/20 bg-white px-3 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            name="type"
          >
            <option value="NOTE">Note</option>
            <option value="CALL">Call</option>
            <option value="EMAIL">Email</option>
            <option value="MEETING">Meeting</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label className="text-xs font-bold text-[#55594f]">
          Subject (optional)
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-black/20 px-3 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            maxLength={200}
            name="subject"
          />
        </label>
      </div>
      <label className="block text-xs font-bold text-[#55594f]">
        Notes
        <textarea
          className="mt-1 min-h-28 w-full rounded-md border border-black/20 px-3 py-2 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
          maxLength={5000}
          name="content"
          required
          rows={4}
        />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="min-h-11 self-start bg-[#171a14] px-4 text-xs font-bold uppercase tracking-[.06em] text-white hover:bg-[#34382e] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Saving..." : "Add to timeline"}
        </button>
        {message && (
          <p aria-live="polite" className="text-sm text-[#55594f]" role="status">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
