"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Notification } from "@/types/collaboration";
import {
  listNotifications,
  markNotificationRead,
} from "@/services/collaboration.service";
import {
  getNotificationMeta,
  normalizeNotificationLink,
} from "@/lib/notification-utils";
import { useNotificationRealtime } from "@/hooks/use-notification-realtime";

type NotificationContextValue = {
  unread: number;
  unreadShares: number;
  refresh: () => Promise<void>;
  openNotification: (n: Notification) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [unreadShares, setUnreadShares] = useState(0);
  const seenToastIds = useRef<Set<number>>(new Set());
  const bootstrapped = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listNotifications();
      setUnread(res.unread);
      setUnreadShares(res.unread_shares ?? 0);
      for (const n of res.data) {
        seenToastIds.current.add(n.id);
      }
      bootstrapped.current = true;
    } catch {
      setUnread(0);
      setUnreadShares(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openNotification = useCallback(
    async (n: Notification) => {
      if (!n.is_read) {
        await markNotificationRead(n.id);
        setUnread((u) => Math.max(0, u - 1));
        if (n.type === "SHARE") {
          setUnreadShares((u) => Math.max(0, u - 1));
        }
      }
      const href = normalizeNotificationLink(n.link);
      if (href) router.push(href);
    },
    [router]
  );

  const showToast = useCallback(
    (n: Notification) => {
      if (seenToastIds.current.has(n.id)) return;
      seenToastIds.current.add(n.id);

      const meta = getNotificationMeta(n.type);
      const href = normalizeNotificationLink(n.link);

      toast(meta.label, {
        description: n.message || n.title,
        action: href
          ? {
              label: "Voir",
              onClick: () => {
                void openNotification(n);
              },
            }
          : undefined,
      });
    },
    [openNotification]
  );

  const handleStream = useCallback(
    (payload: { unread: number; unread_shares?: number; items?: Notification[] }) => {
      setUnread(payload.unread);
      if (typeof payload.unread_shares === "number") {
        setUnreadShares(payload.unread_shares);
      }
      if (!bootstrapped.current) return;
      const items = payload.items ?? [];
      for (const n of items) {
        if (!n.is_read) showToast(n);
      }
    },
    [showToast]
  );

  useNotificationRealtime(handleStream);

  const value = useMemo(
    () => ({ unread, unreadShares, refresh, openNotification }),
    [unread, unreadShares, refresh, openNotification]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationContext);
}
