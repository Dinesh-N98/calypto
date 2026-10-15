"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCrmLeadStatus } from "@/lib/actions/crm";

export const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export function isLeadStatus(value: string): value is LeadStatus {
  return leadStatuses.some((status) => status === value);
}

export type LeadRow = {
  id: string;
  type: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  website: string | null;
  message: string;
  notes: string | null;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
};

type LeadTableRowActionsProps = {
  lead: LeadRow;
  selected: boolean;
  onSelectionChange: (leadId: string, selected: boolean) => void;
};

function getWebsiteHref(website: string): string | null {
  try {
    const url = new URL(/^https?:\/\//iu.test(website) ? website : `https://${website}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function formatLeadDetails(lead: LeadRow): string {
  const location = [lead.city, lead.state, lead.country].filter(Boolean).join(", ");
  return [
    ["Company", lead.company],
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["Location", location],
    ["Address", lead.address],
    ["Website", lead.website],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

export function LeadTableRowActions({
  lead,
  selected,
  onSelectionChange,
}: LeadTableRowActionsProps) {
  const router = useRouter();
  const [savedStatus, setSavedStatus] = useState(lead.status);
  const [status, setOptimisticStatus] = useOptimistic(
    savedStatus,
    (_current: LeadStatus, next: LeadStatus) => next,
  );
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showFeedback(message: string) {
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    setFeedback(message);
    feedbackTimeout.current = setTimeout(() => setFeedback(""), 1800);
  }

  useEffect(
    () => () => {
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    },
    [],
  );

  async function copyLeadDetails() {
    try {
      await navigator.clipboard.writeText(formatLeadDetails(lead));
      showFeedback("Copied!");
    } catch {
      showFeedback("Copy failed.");
    }
  }

  function updateStatus(nextStatus: LeadStatus) {
    if (nextStatus === status) return;
    setFeedback("");
    startTransition(async () => {
      setOptimisticStatus(nextStatus);
      const result = await updateCrmLeadStatus({ leadId: lead.id, status: nextStatus });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setSavedStatus(nextStatus);
      router.refresh();
    });
  }

  const websiteHref = lead.website ? getWebsiteHref(lead.website) : null;
  const displayStatus = (value: LeadStatus) => value.charAt(0) + value.slice(1).toLowerCase();

  return (
    <tr>
      <td className="px-4 py-4">
        <input
          aria-label={`Select ${lead.name}`}
          checked={selected}
          className="size-4 accent-[#718126]"
          onChange={(event) => onSelectionChange(lead.id, event.currentTarget.checked)}
          type="checkbox"
        />
      </td>
      <td className="px-4 py-4">
        <span className="block font-bold">{lead.name}</span>
        {lead.email ? (
          <a
            className="mt-1 block text-xs text-[#65695f] underline underline-offset-2 hover:text-[#171a14]"
            href={`mailto:${lead.email}`}
          >
            {lead.email}
          </a>
        ) : (
          <span className="mt-1 block text-xs text-[#65695f]">No email provided</span>
        )}
        {lead.company && <span className="mt-1 block text-xs text-[#65695f]">{lead.company}</span>}
      </td>
      <td className="px-4 py-4 text-[#55594f]">
        {lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : "—"}
      </td>
      <td className="px-4 py-4">
        {lead.country ? (
          <span className="inline-flex rounded-full bg-[#f0f2e8] px-2.5 py-1 text-xs font-semibold text-[#4e5d1c]">
            {lead.country}
          </span>
        ) : (
          <span className="text-[#55594f]">—</span>
        )}
        {(lead.city || lead.state) && (
          <span className="mt-1 block text-xs text-[#65695f]">
            {[lead.city, lead.state].filter(Boolean).join(" • ")}
          </span>
        )}
      </td>
      <td className="max-w-64 px-4 py-4 text-[#55594f]">
        {lead.address && <span className="block whitespace-pre-line">{lead.address}</span>}
        {lead.website &&
          (websiteHref ? (
            <a
              className="mt-1 block break-all text-xs text-[#4e5d1c] underline underline-offset-2 hover:text-[#171a14]"
              href={websiteHref}
              rel="noreferrer"
              target="_blank"
            >
              {lead.website}
            </a>
          ) : (
            <span className="mt-1 block break-all text-xs">{lead.website}</span>
          ))}
        {!lead.address && !lead.website && "—"}
      </td>
      <td className="px-4 py-4">
        <span className="block text-[#55594f]">{lead.type}</span>
        <label className="sr-only" htmlFor={`lead-status-${lead.id}`}>
          Status for {lead.name}
        </label>
        <select
          className="mt-1 min-h-9 rounded-full border border-black/10 bg-[#f0f2e8] px-2.5 text-xs font-semibold text-[#4e5d1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
          disabled={pending}
          id={`lead-status-${lead.id}`}
          onChange={(event) => {
            if (isLeadStatus(event.currentTarget.value)) updateStatus(event.currentTarget.value);
          }}
          value={status}
        >
          {leadStatuses.map((leadStatus) => (
            <option key={leadStatus} value={leadStatus}>
              {displayStatus(leadStatus)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-4 text-[#55594f]">
        {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(lead.createdAt)}
        {lead.notes && (
          <details className="mt-2 max-w-64 text-xs">
            <summary className="cursor-pointer font-semibold text-[#4e5d1c] underline underline-offset-2">
              View notes
            </summary>
            <p className="mt-1 whitespace-pre-line break-words text-[#65695f]">{lead.notes}</p>
          </details>
        )}
        {lead.message && (
          <details className="mt-2 max-w-64 text-xs">
            <summary className="cursor-pointer font-semibold text-[#4e5d1c] underline underline-offset-2">
              View message
            </summary>
            <p className="mt-1 whitespace-pre-line break-words text-[#65695f]">{lead.message}</p>
          </details>
        )}
      </td>
      <td className="px-4 py-4">
        <button
          aria-label={`Copy details for ${lead.name}`}
          className="min-h-9 border border-black/20 px-3 text-xs font-bold hover:border-[#718126] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
          onClick={copyLeadDetails}
          type="button"
        >
          Copy details
        </button>
        <span aria-live="polite" className="sr-only" role="status">
          {feedback}
        </span>
        {feedback && <span className="ml-2 text-xs text-[#4e5d1c]">{feedback}</span>}
      </td>
    </tr>
  );
}
