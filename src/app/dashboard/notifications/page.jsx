"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Trash2,
  PackageX,
  PackageSearch,
  ShoppingCart,
  ShoppingBag,
  ArrowRightLeft,
  Undo2,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { NOTIFICATION_TYPE_LABELS, NOTIFICATION_TYPES } from "@/lib/notifications";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  LOW_STOCK: PackageSearch,
  OUT_OF_STOCK: PackageX,
  NEW_SALE: ShoppingCart,
  NEW_PURCHASE: ShoppingBag,
  TRANSFER: ArrowRightLeft,
  RETURN: Undo2,
  SYSTEM: Info,
};

const TYPE_COLORS = {
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "destructive",
  NEW_SALE: "success",
  NEW_PURCHASE: "default",
  TRANSFER: "secondary",
  RETURN: "secondary",
  SYSTEM: "outline",
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const {
    notifications,
    prefs,
    loading,
    loadNotifications,
    loadPrefs,
    markRead,
    markAllRead,
    remove,
    savePrefs,
  } = useNotifications();

  useEffect(() => {
    loadNotifications(100);
    loadPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = notifications.filter((n) => !n.readBy?.[profile?.id]).length;

  const togglePref = async (type) => {
    const next = { ...prefs, [type]: !prefs[type] };
    await savePrefs(next);
    toast.success(`${NOTIFICATION_TYPE_LABELS[type]} turned ${next[type] ? "on" : "off"}`);
  };

  const handleMarkRead = async (n) => {
    if (!n.readBy?.[profile?.id]) await markRead(n.id);
  };

  const handleMarkAll = async () => {
    await markAllRead();
    toast.success("All notifications marked as read");
  };

  const handleDelete = async (id) => {
    await remove(id);
    toast.success("Notification deleted");
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Stay on top of stock levels, sales, and activity"
        actions={
          <Button onClick={handleMarkAll} disabled={notifications.length === 0}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Notification list */}
        <div className="lg:col-span-2">
          {loading ? (
            <LoadingSkeleton className="h-64 w-full" />
          ) : notifications.length === 0 ? (
            <EmptyState
              title="No notifications yet"
              description="Low stock, out of stock, new sales and purchases will appear here."
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                const isRead = !!n.readBy?.[profile?.id];
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40",
                      !isRead && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {!isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      {n.message && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant={TYPE_COLORS[n.type] || "secondary"}>
                          {NOTIFICATION_TYPE_LABELS[n.type] || n.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(n.id);
                      }}
                      aria-label="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preferences */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.keys(NOTIFICATION_TYPES).map((type) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5"
              >
                <span className="text-sm">{NOTIFICATION_TYPE_LABELS[type]}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!prefs[type]}
                  onClick={() => togglePref(type)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    prefs[type] ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      prefs[type] ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}