"use client";

import { cn } from "@/lib/utils";

export type WorkflowStatusTab =
  "all" | "APPROUVE" | "REJETE" | "ANNULE" | "my-decisions";

const TABS: { id: WorkflowStatusTab; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "APPROUVE", label: "Approuves" },
  { id: "REJETE", label: "Rejetes" },
  { id: "ANNULE", label: "Annules" },
  { id: "my-decisions", label: "Mes decisions" },
];

type WorkflowStatusTabsProps = {
  value: WorkflowStatusTab;
  onChange: (tab: WorkflowStatusTab) => void;
  counts?: Partial<Record<WorkflowStatusTab, number>>;
};

export function WorkflowStatusTabs({
  value,
  onChange,
  counts,
}: WorkflowStatusTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === tab.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-accent hover:text-foreground",
          )}
        >
          {tab.label}
          {counts?.[tab.id] != null && counts[tab.id]! > 0 && (
            <span className="ml-1.5 opacity-80">({counts[tab.id]})</span>
          )}
        </button>
      ))}
    </div>
  );
}
