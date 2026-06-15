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

export function NotificationItem({ notification, onClick, index = 0 }: NotificationItemProps) {
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
        className={`group flex w-full items-start gap-3 rounded-2xl px-3 py-4 text-left transition-colors hover:bg-zinc-50 ${
          !notification.is_read ? "bg-emerald-500/5 ring-1 ring-emerald-500/10" : ""
        }`}
      >
        <span className={`mt-0.5 rounded-xl p-2.5 ${meta.iconBg}`}>
          <Icon className="h-4 w-4" weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p
              className={`text-sm text-zinc-900 ${
                !notification.is_read ? "font-semibold" : "font-medium"
              }`}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{notification.message}</p>
          <p className="mt-2 text-xs text-zinc-400">
            {new Date(notification.created_at).toLocaleString("fr-FR")} ·{" "}
            <span className={`font-medium ${meta.accent}`}>{meta.label}</span>
          </p>
        </div>
        {notification.link && (
          <CaretRight className="mt-2 h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-emerald-600" />
        )}
      </button>
    </motion.li>
  );
}
