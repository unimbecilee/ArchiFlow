import apiClient from "@/lib/api";

/** Fetch short-lived WebSocket ticket (POST /api/ws/ticket). */
export async function fetchWsTicket(): Promise<string> {
  const { data } = await apiClient.post<{
    success: boolean;
    data?: { ticket?: string };
  }>("/api/ws/ticket");
  const ticket = data?.data?.ticket;
  if (!ticket) {
    throw new Error("ticket WebSocket manquant");
  }
  return ticket;
}
