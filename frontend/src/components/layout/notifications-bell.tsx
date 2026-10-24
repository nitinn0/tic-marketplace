"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { routes } from "@/lib/constants";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

function hrefFor(item: NotificationItem) {
  if (item.entityType === "rfq" && item.entityId) return routes.rfq(item.entityId);
  if (item.entityType === "provider" && item.entityId) return routes.provider(item.entityId);
  return routes.dashboard;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!isAuthenticated()) {
      setItems([]);
      setUnread(0);
      return;
    }
    api
      .get<{ unreadCount: number; notifications: NotificationItem[] }>("/notifications")
      .then((data) => {
        setItems(data.notifications);
        setUnread(data.unreadCount);
      })
      .catch(() => {
        setItems([]);
        setUnread(0);
      });
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  if (!isAuthenticated()) return null;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) load();
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-700 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-sky-700"
                onClick={() => void api.post("/notifications/read-all").then(load)}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">No notifications yet.</li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={hrefFor(item)}
                    onClick={() => {
                      if (!item.readAt) void api.post(`/notifications/${item.id}/read`).then(load);
                      setOpen(false);
                    }}
                    className={cn(
                      "block border-b border-slate-50 px-3 py-3 hover:bg-slate-50",
                      !item.readAt && "bg-sky-50/50",
                    )}
                  >
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{item.body}</p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
