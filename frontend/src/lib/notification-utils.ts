import type { Icon } from "@phosphor-icons/react";
import {
  Bell,
  ChatCircle,
  CheckCircle,
  Clock,
  ShareNetwork,
  XCircle,
  Prohibit,
  GitBranch,
} from "@phosphor-icons/react";
import type { Notification } from "@/types/collaboration";

export type NotificationMeta = {
  label: string;
  Icon: Icon;
  accent: string;
  iconBg: string;
};

export function getNotificationMeta(type: string): NotificationMeta {
  switch (type) {
    case "WORKFLOW_PENDING":
      return {
        label: "Approbation",
        Icon: Clock,
        accent: "text-accent-soft-foreground",
        iconBg: "bg-accent-soft text-accent-soft-foreground",
      };
    case "WORKFLOW_APPROVED":
      return {
        label: "Approuve",
        Icon: CheckCircle,
        accent: "text-accent-soft-foreground",
        iconBg: "bg-accent-soft text-accent-soft-foreground",
      };
    case "WORKFLOW_REJECTED":
      return {
        label: "Rejete",
        Icon: XCircle,
        accent: "text-warning-soft-foreground",
        iconBg: "bg-warning-soft text-warning-soft-foreground",
      };
    case "WORKFLOW_CANCELLED":
      return {
        label: "Annule",
        Icon: Prohibit,
        accent: "text-muted-foreground",
        iconBg: "bg-muted text-foreground",
      };
    case "WORKFLOW_STEP":
      return {
        label: "Etape",
        Icon: GitBranch,
        accent: "text-accent-soft-foreground",
        iconBg: "bg-accent-soft text-accent-soft-foreground",
      };
    case "SHARE":
      return {
        label: "Partage",
        Icon: ShareNetwork,
        accent: "text-info-soft-foreground",
        iconBg: "bg-info-soft text-info-soft-foreground",
      };
    case "COMMENT":
      return {
        label: "Commentaire",
        Icon: ChatCircle,
        accent: "text-foreground",
        iconBg: "bg-muted text-foreground",
      };
    default:
      return {
        label: type,
        Icon: Bell,
        accent: "text-foreground",
        iconBg: "bg-muted text-foreground",
      };
  }
}

export function normalizeNotificationLink(link?: string): string | null {
  if (!link) return null;
  return link.startsWith("/") ? link : `/${link}`;
}

export type NotificationGroup = {
  key: "today" | "week" | "older";
  title: string;
  items: Notification[];
};

export function groupNotifications(items: Notification[]): NotificationGroup[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const today: Notification[] = [];
  const week: Notification[] = [];
  const older: Notification[] = [];

  for (const n of items) {
    const d = new Date(n.created_at);
    if (d >= startOfToday) today.push(n);
    else if (d >= startOfWeek) week.push(n);
    else older.push(n);
  }

  const groups: NotificationGroup[] = [];
  if (today.length)
    groups.push({ key: "today", title: "Aujourd'hui", items: today });
  if (week.length)
    groups.push({ key: "week", title: "Cette semaine", items: week });
  if (older.length)
    groups.push({ key: "older", title: "Plus ancien", items: older });
  return groups;
}
