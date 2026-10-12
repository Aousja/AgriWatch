import { useMemo, useState } from "react";

// Generic client-side sort for an array of objects. Pass the raw data in,
// get back the sorted array plus a sortConfig + requestSort() to wire up
// clickable column headers.
export function useSortableData(items, initialKey = null, initialDir = "asc") {
  const [sortConfig, setSortConfig] = useState(
    initialKey ? { key: initialKey, direction: initialDir } : null
  );

  const sorted = useMemo(() => {
    if (!sortConfig) return items;
    const { key, direction } = sortConfig;
    return [...items].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return direction === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return direction === "asc" ? cmp : -cmp;
    });
  }, [items, sortConfig]);

  function requestSort(key) {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null; // third click clears sort
    });
  }

  return { sorted, sortConfig, requestSort };
}
