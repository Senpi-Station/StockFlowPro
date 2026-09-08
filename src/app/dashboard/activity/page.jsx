"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { ACTIVITY_ACTIONS } from "@/lib/activity";
import { formatDateTime } from "@/lib/utils";

const ACTION_COLORS = {
  COMPLETED_SALE: "success",
  CREATE_PURCHASE: "default",
  RECEIVE_PURCHASE: "default",
  CANCEL_PURCHASE: "destructive",
  PROCESS_RETURN: "warning",
  CREATE_TRANSFER: "secondary",
  STOCK_IN: "success",
  STOCK_OUT: "destructive",
  ADJUST_STOCK: "warning",
  CREATE_PRODUCT: "default",
  UPDATE_PRODUCT: "secondary",
  ARCHIVE_PRODUCT: "destructive",
};

export default function ActivityLogsPage() {
  const { logs, loading, loadLogs } = useActivityLogs();
  const [actionFilter, setActionFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLogs(300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
      if (!q) return true;
      return (
        (log.description || "").toLowerCase().includes(q) ||
        (log.userName || "").toLowerCase().includes(q)
      );
    });
  }, [logs, actionFilter, search]);

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        description="A trail of important actions taken across your business"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="ALL">All actions</option>
          {Object.entries(ACTIVITY_ACTIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Input
          placeholder="Search by description or user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="ml-auto self-center text-sm text-muted-foreground">
          {filtered.length} entry{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingSkeleton className="h-64 w-full" />
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No activity logs"
                description="Actions like completing a sale, adding stock, or creating a purchase will be recorded here."
              />
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={ACTION_COLORS[log.action] || "secondary"}>
                        {ACTIVITY_ACTIONS[log.action] || log.action}
                      </Badge>
                      <span className="text-sm font-medium">
                        {log.userName || "System"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {log.description || "-"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}