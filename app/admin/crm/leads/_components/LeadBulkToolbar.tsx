"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bulkUpdateCrmLeadStatus } from "@/lib/actions/crm";
import { isLeadStatus, leadStatuses, type LeadStatus } from "./LeadTableRowActions";

type LeadBulkToolbarProps = {
  leadIds: string[];
  onClear: () => void;
};

function displayStatus(status: LeadStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function LeadBulkToolbar({ leadIds, onClear }: LeadBulkToolbarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  function applyStatus(status: LeadStatus) {
    setFeedback("");
    startTransition(async () => {
      const result = await bulkUpdateCrmLeadStatus({ leadIds, status });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      onClear();
      router.refresh();
    });
  }

  if (leadIds.length === 0) return null;

  return (
    <div className="sticky top-2 z-20 flex flex-col gap-3 rounded-lg border border-[#718126]/30 bg-white p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <p aria-live="polite" className="text-sm font-bold text-[#171a14]">
          {leadIds.length} {leadIds.length === 1 ? "lead" : "leads"} selected
        </p>
        <label className="text-xs font-bold text-[#55594f]">
          Bulk status
          <select
            className="ml-2 min-h-10 rounded-md border border-black/20 bg-white px-3 text-sm font-normal text-[#161812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
            disabled={pending}
            onChange={(event) => {
              if (isLeadStatus(event.currentTarget.value)) applyStatus(event.currentTarget.value);
            }}
            value=""
          >
            <option value="">Update status…</option>
            {leadStatuses.map((status) => (
              <option key={status} value={status}>
                {displayStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="min-h-10 px-3 text-xs font-bold uppercase tracking-[.06em] text-[#55594f] underline underline-offset-4 hover:text-[#171a14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
          disabled={pending}
          onClick={onClear}
          type="button"
        >
          Clear selection
        </button>
      </div>
      {feedback && (
        <p aria-live="assertive" className="text-sm text-red-800" role="alert">
          {feedback}
        </p>
      )}
    </div>
  );
}
