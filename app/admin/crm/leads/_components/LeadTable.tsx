"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCrmLeadDetail } from "@/lib/actions/crm";
import { LeadBulkToolbar } from "./LeadBulkToolbar";
import { LeadTableRowActions, type LeadRow } from "./LeadTableRowActions";
import { LeadDetailDrawer, type LeadDetail } from "./LeadDetailDrawer";

type LeadTableProps = {
  leads: LeadRow[];
  initialLead?: LeadDetail | null;
};

export function LeadTable({ leads, initialLead = null }: LeadTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeLead, setActiveLead] = useState<LeadDetail | null>(initialLead);
  const [openingLead, setOpeningLead] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const allSelected = leads.length > 0 && leads.every((lead) => selectedIds.includes(lead.id));

  useEffect(() => {
    async function syncDrawerToUrl() {
      const leadId = new URLSearchParams(window.location.search).get("leadId");
      if (!leadId) {
        setActiveLead(null);
        setDrawerError("");
        return;
      }
      const result = await getCrmLeadDetail(leadId);
      if (result.ok) {
        setActiveLead(result.lead);
        setDrawerError("");
      } else {
        setActiveLead(null);
        setDrawerError(result.error);
      }
    }

    window.addEventListener("popstate", syncDrawerToUrl);
    return () => window.removeEventListener("popstate", syncDrawerToUrl);
  }, []);

  function updateLeadUrl(leadId: string | null, replace = false) {
    const url = new URL(window.location.href);
    if (leadId) url.searchParams.set("leadId", leadId);
    else url.searchParams.delete("leadId");
    const href = `${url.pathname}${url.search}${url.hash}`;
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }

  async function openLead(leadId: string) {
    setOpeningLead(true);
    setDrawerError("");
    const result = await getCrmLeadDetail(leadId);
    setOpeningLead(false);
    if (!result.ok) {
      setDrawerError(result.error);
      return;
    }
    setActiveLead(result.lead);
    updateLeadUrl(leadId);
  }

  function closeDrawer() {
    setActiveLead(null);
    setDrawerError("");
    updateLeadUrl(null, true);
  }

  function setLeadSelected(leadId: string, selected: boolean) {
    setSelectedIds((current) =>
      selected
        ? current.includes(leadId)
          ? current
          : [...current, leadId]
        : current.filter((id) => id !== leadId),
    );
  }

  function selectVisibleLeads(selected: boolean) {
    setSelectedIds((current) => {
      const visibleIds = new Set(leads.map((lead) => lead.id));
      const remaining = current.filter((id) => !visibleIds.has(id));
      return selected ? [...remaining, ...visibleIds] : remaining;
    });
  }

  return (
    <div className="space-y-3">
      <LeadBulkToolbar leadIds={selectedIds} onClear={() => setSelectedIds([])} />
      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white shadow-sm">
        <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
          <thead className="bg-[#f4f5f1] text-xs uppercase tracking-[.08em] text-[#55594f]">
            <tr>
              <th className="px-4 py-3">
                <input
                  aria-label="Select all leads on this page"
                  checked={allSelected}
                  className="size-4 accent-[#718126]"
                  onChange={(event) => selectVisibleLeads(event.currentTarget.checked)}
                  type="checkbox"
                />
              </th>
              <th className="px-4 py-3">Name / email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Address / website</th>
              <th className="px-4 py-3">Type / status</th>
              <th className="px-4 py-3">Notes / received</th>
              <th className="px-4 py-3">
                <span className="sr-only">Quick actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {leads.map((lead) => (
              <LeadTableRowActions
                key={lead.id}
                lead={lead}
                onSelectionChange={setLeadSelected}
                onOpen={openLead}
                selected={selectedIds.includes(lead.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {openingLead && (
        <p aria-live="polite" className="sr-only" role="status">
          Loading lead details…
        </p>
      )}
      {drawerError && (
        <p aria-live="assertive" className="text-sm text-red-800" role="alert">
          {drawerError}
        </p>
      )}
      {activeLead && (
        <LeadDetailDrawer lead={activeLead} onClose={closeDrawer} onLeadChange={setActiveLead} />
      )}
    </div>
  );
}
