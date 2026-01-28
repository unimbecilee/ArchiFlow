import api from './api';

export async function search(params: { q: string; limit?: number; type?: string }) {
  const { data } = await api.get('/search', { params });
  return data;
}

export type AdvancedSearchParams = {
  searchTerm?: string;
  contentSearch?: string;
  ocrSearch?: string;
  documentTypes?: string;
  owners?: string;
  tags?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minSize?: string;
  maxSize?: string;
  hasAttachments?: boolean | string;
  isShared?: boolean | string;
  isFavorite?: boolean | string;
  hasOCR?: boolean | string;
  language?: string;
  confidenceThreshold?: number | string;
  includeArchived?: boolean | string;
  limit?: number;
};

export async function advancedSearch(params: AdvancedSearchParams) {
  const { data } = await api.get('/search/advanced', { params });
  return data;
}

export async function getSavedSearches() {
  const { data } = await api.get('/search/saved');
  return data;
}

export async function saveSearch(payload: { name: string; filters: Record<string, any> }) {
  const { data } = await api.post('/search/saved', payload);
  return data;
}

export async function deleteSavedSearch(searchId: number) {
  const { data } = await api.delete(`/search/saved/${searchId}`);
  return data;
}

export async function executeSavedSearch(searchId: number) {
  const { data } = await api.get(`/search/saved/${searchId}/execute`);
  return data;
}

export async function getSearchSuggestions(q: string) {
  const { data } = await api.get('/search/suggestions', { params: { q } });
  return data;
}
