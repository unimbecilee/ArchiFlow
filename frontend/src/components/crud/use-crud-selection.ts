"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function useCrudSelection<T>(
  items: T[],
  getItemId: (item: T) => string | number,
) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const itemIds = useMemo(
    () => items.map((item) => String(getItemId(item))),
    [items, getItemId],
  );

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(
        Array.from(prev).filter((id) => itemIds.includes(id)),
      );
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [itemIds]);

  const toggle = useCallback((id: string | number) => {
    const key = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (itemIds.length === 0) return prev;
      const allOn = itemIds.every((id) => prev.has(id));
      if (allOn) return new Set();
      return new Set(itemIds);
    });
  }, [itemIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const selectedItems = useMemo(
    () => items.filter((item) => selected.has(String(getItemId(item)))),
    [items, selected, getItemId],
  );

  const allSelected =
    itemIds.length > 0 && itemIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  return {
    selected,
    selectedItems,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
    count: selected.size,
    isSelected: (id: string | number) => selected.has(String(id)),
  };
}
