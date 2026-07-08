"use client";

import { useCallback, useEffect, useState } from "react";

type UseDocumentListPageOptions<T> = {
  loadFn: () => Promise<T[]>;
};

export function useDocumentListPage<T>({ loadFn }: UseDocumentListPageOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await loadFn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [loadFn]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, load };
}
