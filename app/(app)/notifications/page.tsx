import type { Metadata } from "next";
import { BellOff } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/datetime";
import { getNotifications } from "@/lib/services/notifications.service";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const notifications = await getNotifications();
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <TopBar
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : "All caught up"}
      />

      <div className="flex-1 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          {notifications.length > 0 ? (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className="flex gap-3 px-4 py-3 md:px-6"
                >
                  <span
                    aria-hidden
                    className={
                      notification.is_read
                        ? "mt-1.5 size-2 shrink-0 rounded-full bg-transparent"
                        : "mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                    }
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-sm font-medium">
                        {notification.title}
                        {!notification.is_read ? (
                          <span className="sr-only"> (unread)</span>
                        ) : null}
                      </p>
                      <p className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatDate(notification.created_at.slice(0, 10))} ·{" "}
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={BellOff}
              title="Nothing here yet"
              description="You will be notified when a correction is reviewed or applied."
            />
          )}
        </Card>
      </div>
    </>
  );
}
