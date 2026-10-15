"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createCrmInteraction,
  getCrmLeadDetail,
  updateCrmLeadNotes,
  updateCrmLeadStatus,
} from "@/lib/actions/crm";
import { isLeadStatus, leadStatuses, type LeadRow, type LeadStatus } from "./LeadTableRowActions";

type LeadInteraction = {
  id: string;
  type: "NOTE" | "CALL" | "EMAIL" | "MEETING" | "OTHER";
  subject: string | null;
  content: string;
  occurredAt: Date;
  author: { id: string; name: string | null };
};

export type LeadDetail = LeadRow & {
  interactions: LeadInteraction[];
};

type LeadDetailDrawerProps = {
  lead: LeadDetail;
  onClose: () => void;
  onLeadChange: (lead: LeadDetail) => void;
};

type DrawerTab = "profile" | "activity";

function displayStatus(status: LeadStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getWebsiteHref(website: string): string | null {
  try {
    const url = new URL(/^https?:\/\//iu.test(website) ? website : `https://${website}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function getWhatsAppHref(phone: string): string | null {
  const internationalPhone = phone.replace(/[^\d+]/gu, "");
  if (!/^\+[1-9]\d{6,14}$/u.test(internationalPhone)) return null;
  return `https://wa.me/${internationalPhone.slice(1)}`;
}

export function LeadDetailDrawer({ lead, onClose, onLeadChange }: LeadDetailDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>("profile");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const location = [
    ["Country", lead.country],
    ["State / Province", lead.state],
    ["City", lead.city],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const websiteHref = lead.website ? getWebsiteHref(lead.website) : null;
  const whatsappHref = lead.phone ? getWhatsAppHref(lead.phone) : null;

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function refreshLead() {
    startTransition(async () => {
      const result = await getCrmLeadDetail(lead.id);
      if (result.ok) onLeadChange(result.lead as LeadDetail);
      else setFeedback(result.error);
    });
  }

  function changeStatus(nextStatus: string) {
    if (!isLeadStatus(nextStatus) || nextStatus === lead.status) return;
    setFeedback("");
    startTransition(async () => {
      const result = await updateCrmLeadStatus({ leadId: lead.id, status: nextStatus });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      onLeadChange({ ...lead, status: nextStatus });
      refreshLead();
    });
  }

  function saveNotes(formData: FormData) {
    setFeedback("");
    setSavingNotes(true);
    startTransition(async () => {
      const result = await updateCrmLeadNotes({
        leadId: lead.id,
        notes: String(formData.get("notes") ?? ""),
      });
      setSavingNotes(false);
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      onLeadChange({ ...lead, notes: result.lead.notes });
      setFeedback("Notes saved.");
    });
  }

  function logInteraction(formData: FormData) {
    setFeedback("");
    startTransition(async () => {
      const result = await createCrmInteraction({
        leadId: lead.id,
        type: String(formData.get("type") ?? "NOTE"),
        subject: String(formData.get("subject") ?? ""),
        content: String(formData.get("content") ?? ""),
      });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setFeedback("Activity logged.");
      refreshLead();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        aria-label={`Lead details: ${lead.company || lead.name}`}
        aria-modal="true"
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl"
        role="dialog"
      >
        <header className="border-b border-black/10 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[.1em] text-[#718126]">
                Lead profile
              </p>
              <h2 className="mt-2 truncate text-2xl font-black tracking-[-.04em] text-[#171a14]">
                {lead.company || lead.name}
              </h2>
              {lead.company && <p className="mt-1 text-sm text-[#55594f]">{lead.name}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {location.map(([label, part]) => (
                  <span
                    className="rounded-full bg-[#f0f2e8] px-2.5 py-1 text-xs font-semibold text-[#4e5d1c]"
                    key={label}
                  >
                    {label}: {part}
                  </span>
                ))}
              </div>
            </div>
            <button
              aria-label="Close lead details"
              className="inline-flex size-10 shrink-0 items-center justify-center border border-black/20 text-xl hover:border-[#718126] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
          <label className="mt-4 block text-xs font-bold text-[#55594f]">
            Lead status
            <select
              className="mt-1 min-h-10 rounded-md border border-black/20 bg-white px-3 text-sm font-normal text-[#161812]"
              disabled={pending}
              onChange={(event) => changeStatus(event.currentTarget.value)}
              value={lead.status}
            >
              {leadStatuses.map((status) => (
                <option key={status} value={status}>
                  {displayStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <div aria-label="Lead detail sections" className="mt-5 flex gap-2" role="tablist">
            <button
              aria-controls="lead-profile-panel"
              aria-selected={tab === "profile"}
              className={`min-h-10 border-b-2 px-3 text-sm font-semibold ${tab === "profile" ? "border-[#718126] text-[#171a14]" : "border-transparent text-[#65695f]"}`}
              id="lead-profile-tab"
              onClick={() => setTab("profile")}
              role="tab"
              type="button"
            >
              Profile
            </button>
            <button
              aria-controls="lead-activity-panel"
              aria-selected={tab === "activity"}
              className={`min-h-10 border-b-2 px-3 text-sm font-semibold ${tab === "activity" ? "border-[#718126] text-[#171a14]" : "border-transparent text-[#65695f]"}`}
              id="lead-activity-tab"
              onClick={() => setTab("activity")}
              role="tab"
              type="button"
            >
              Activity ({lead.interactions.length})
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {tab === "profile" ? (
            <section aria-labelledby="lead-profile-tab" id="lead-profile-panel" role="tabpanel">
              <h3 className="text-lg font-bold text-[#171a14]">Contact information</h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#65695f]">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm">
                    {lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#65695f]">
                    Phone
                  </dt>
                  <dd className="mt-1 text-sm">
                    {lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : "—"}
                  </dd>
                  {lead.phone && (
                    whatsappHref ? (
                      <a
                        className="mt-1 block text-xs text-[#4e5d1c] underline underline-offset-2"
                        href={whatsappHref}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open WhatsApp (if available)
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-[#65695f]">
                        WhatsApp requires a valid international number.
                      </p>
                    )
                  )}
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#65695f]">
                    Address
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm">{lead.address || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#65695f]">
                    Website
                  </dt>
                  <dd className="mt-1 break-all text-sm">
                    {lead.website && websiteHref ? (
                      <a href={websiteHref} rel="noreferrer" target="_blank">
                        {lead.website}
                      </a>
                    ) : (
                      lead.website || "—"
                    )}
                  </dd>
                </div>
              </dl>

              {lead.message && (
                <section className="mt-6 rounded-lg border border-black/10 bg-[#f8f9f6] p-4">
                  <h3 className="text-sm font-bold text-[#171a14]">Customer inquiry</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#55594f]">
                    {lead.message}
                  </p>
                </section>
              )}

              <section className="mt-6">
                <h3 className="text-sm font-bold text-[#171a14]">Internal admin notes</h3>
                <form action={saveNotes} className="mt-2 space-y-3">
                  <textarea
                    className="min-h-32 w-full rounded-md border border-black/20 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
                    defaultValue={lead.notes ?? ""}
                    maxLength={5000}
                    name="notes"
                    placeholder="Add private notes for your team"
                    rows={5}
                  />
                  <button
                    className="min-h-10 bg-[#171a14] px-4 text-xs font-bold uppercase tracking-[.06em] text-white disabled:opacity-60"
                    disabled={pending || savingNotes}
                    type="submit"
                  >
                    {savingNotes ? "Saving…" : "Save notes"}
                  </button>
                </form>
              </section>
            </section>
          ) : (
            <section aria-labelledby="lead-activity-tab" id="lead-activity-panel" role="tabpanel">
              <h3 className="text-lg font-bold text-[#171a14]">Interaction timeline</h3>
              {lead.interactions.length > 0 ? (
                <ol className="mt-4 space-y-4 border-l border-[#d8ddc8] pl-5">
                  {lead.interactions.map((interaction) => (
                    <li className="relative" key={interaction.id}>
                      <span
                        aria-hidden="true"
                        className="absolute -left-[1.55rem] top-1.5 size-2.5 rounded-full bg-[#718126]"
                      />
                      <p className="text-xs font-bold uppercase tracking-wide text-[#4e5d1c]">
                        {interaction.type.toLowerCase()}
                        {interaction.subject ? ` · ${interaction.subject}` : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#55594f]">
                        {interaction.content}
                      </p>
                      <p className="mt-1 text-xs text-[#65695f]">
                        {interaction.author.name || "Admin"} · {formatDate(interaction.occurredAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-[#65695f]">No activity has been logged yet.</p>
              )}

              <form
                action={logInteraction}
                className="mt-8 space-y-3 rounded-lg border border-black/10 p-4"
              >
                <h3 className="text-sm font-bold text-[#171a14]">Log an activity</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-[#55594f]">
                    Type
                    <select
                      className="mt-1 min-h-10 w-full rounded-md border border-black/20 bg-white px-3 text-sm font-normal"
                      name="type"
                    >
                      <option value="NOTE">Note</option>
                      <option value="CALL">Call</option>
                      <option value="EMAIL">Email</option>
                      <option value="MEETING">Meeting</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-[#55594f]">
                    Subject
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-black/20 px-3 text-sm font-normal"
                      maxLength={200}
                      name="subject"
                    />
                  </label>
                </div>
                <label className="block text-xs font-bold text-[#55594f]">
                  Activity notes
                  <textarea
                    className="mt-1 min-h-24 w-full rounded-md border border-black/20 px-3 py-2 text-sm font-normal"
                    maxLength={5000}
                    name="content"
                    required
                    rows={4}
                  />
                </label>
                <button
                  className="min-h-10 bg-[#171a14] px-4 text-xs font-bold uppercase tracking-[.06em] text-white disabled:opacity-60"
                  disabled={pending}
                  type="submit"
                >
                  Log activity
                </button>
              </form>
            </section>
          )}
          {feedback && (
            <p
              aria-live={feedback.endsWith("failed.") ? "assertive" : "polite"}
              className={`mt-4 text-sm ${feedback.endsWith("failed.") ? "text-red-800" : "text-[#4e5d1c]"}`}
              role={feedback.endsWith("failed.") ? "alert" : "status"}
            >
              {feedback}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
