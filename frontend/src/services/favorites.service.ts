import api from "@/lib/api";
import type { Document } from "@/types/documents";

export async function getFavorites(): Promise<Document[]> {
  const res = await api.get<{ success: boolean; documents: Document[] }>(
    "/api/favorites",
  );
  return res.data.documents ?? [];
}

export async function getFavoriteStatus(docId: number): Promise<boolean> {
  const res = await api.get<{ success: boolean; favorited: boolean }>(
    `/api/documents/${docId}/favorite`,
  );
  return res.data.favorited;
}

export async function addFavorite(docId: number): Promise<void> {
  await api.post(`/api/documents/${docId}/favorite`);
}

export async function removeFavorite(docId: number): Promise<void> {
  await api.delete(`/api/documents/${docId}/favorite`);
}
