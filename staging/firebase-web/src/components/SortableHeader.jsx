import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export default function SortableHeader({ label, sortKey, sortConfig, onSort }) {
  const active = sortConfig?.key === sortKey;
  const Icon = active ? (sortConfig.direction === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <th className="pb-2 font-medium">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-ink transition-colors"
      >
        {label}
        <Icon size={12} className={active ? "text-primary" : "text-ink/25"} />
      </button>
    </th>
  );
}
