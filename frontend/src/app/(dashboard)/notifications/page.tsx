"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, ArrowsClockwise, Checks } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/layout/page-frame";
import { PageHeader } from "@/components/layout/page-header";
import { PagePanel } from "@/components/layout/page-panel";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { EmptyState } from "@/components/layout/empty-state";
import { NotificationItem } from "@/components/notifications/notification-item";
import { groupNotifications } from "@/lib/notification-utils";
import type { Notification } from "@/types/collaboration";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/services/collaboration.service";
import { useNotifications } from "@/context/notification-context";

export default function NotificationsPage() {
  const { openNotification, refresh: refreshCounts } = useNotifications();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listNotifications();
      setItems(res.data);
      setUnread(res.unread);
      await refreshCounts();
    } finally {
      setLoading(false);
    }
  }, [refreshCounts]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpen = async (n: Notification) => {
    await openNotification(n);
    await load();
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    await load();
  };

  const groups = groupNotifications(items);

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Activite"
        title="Notifications"
        description="Alertes workflows, partages et commentaires en temps reel."
        icon={<Bell className="h-6 w-6" weight="duotone" />}
        badge={
          unread > 0 ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              {unread} non lue(s)
            </span>
          ) : undefined
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <ArrowsClockwise className="h-4 w-4" />
              Actualiser
            </Button>
            {unread > 0 && (
              <Button variant="outline" size="sm" onClick={handleReadAll} className="gap-1.5">
                <Checks className="h-4 w-4" />
                Tout marquer lu
              </Button>
            )}
          </>
        }
      />

      <PagePanel
        title="Historique"
        subtitle={loading ? "Chargement..." : `${items.length} notification(s)`}
      >
        {loading ? (
          <ListSkeleton rows={5} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucune notification"
            description="Les evenements importants s'afficheront ici des qu'ils seront emis."
            icon={<Bell className="h-6 w-6" weight="duotone" />}
          />
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {group.title}
                </h3>
                <ul className="divide-y divide-slate-100">
                  {group.items.map((n, index) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      index={index}
                      onClick={handleOpen}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PagePanel>
    </PageFrame>
  );
}
