"use client";

import { motion } from "framer-motion";
import { CaretRight } from "@phosphor-icons/react";
import { getNotificationMeta } from "@/lib/notification-utils";
import type { Notification } from "@/types/collaboration";

type NotificationItemProps = {
  notification: Notification;
  onClick: (notification: Notification) => void;
  index?: number;
};

export function NotificationItem({
  notification,
  onClick,
  index = 0,
}: NotificationItemProps) {
  const meta = getNotificationMeta(notification.type);
  const Icon = meta.Icon;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <button
        type="button"
        onClick={() => onClick(notification)}
        className={`group flex w-full items-start gap-3 rounded-2xl px-3 py-4 text-left transition-colors hover:bg-muted ${
          !notification.is_read ? "bg-primary/5 ring-1 ring-primary/15" : ""
        }`}
      >
        <span className={`mt-0.5 rounded-xl p-2.5 ${meta.iconBg}`}>
          <Icon className="h-4 w-4" weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p
              className={`text-sm text-foreground ${
                !notification.is_read ? "font-semibold" : "font-medium"
              }`}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {notification.message}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(notification.created_at).toLocaleString("fr-FR")} ·{" "}
            <span className={`font-medium ${meta.accent}`}>{meta.label}</span>
          </p>
        </div>
        {notification.link && (
          <CaretRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        )}
      </button>
    </motion.li>
  );
}
