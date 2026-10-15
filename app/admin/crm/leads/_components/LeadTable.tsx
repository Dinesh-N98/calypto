"use client";

import { useState } from "react";
import { LeadBulkToolbar } from "./LeadBulkToolbar";
import { LeadTableRowActions, type LeadRow } from "./LeadTableRowActions";

type LeadTableProps = {
  leads: LeadRow[];
};

export function LeadTable({ leads }: LeadTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = leads.length > 0 && leads.every((lead) => selectedIds.includes(lead.id));

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
                selected={selectedIds.includes(lead.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
