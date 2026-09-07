"use client";

import { useEffect, useState } from "react";
import { useInventory } from "@/hooks/useInventory";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { formatDateTime } from "@/lib/utils";

const TYPE_LABELS = {
  STOCK_IN: "Stock In",
  STOCK_OUT: "Stock Out",
  SALE: "Sale",
  RETURN: "Return",
  DAMAGED: "Damaged",
  EXPIRED: "Expired",
  LOST: "Lost",
  ADJUSTMENT: "Adjustment",
  TRANSFER_OUT: "Transfer Out",
  TRANSFER_IN: "Transfer In",
};

const TYPE_COLORS = {
  STOCK_IN: "success",
  SALE: "destructive",
  RETURN: "secondary",
  ADJUSTMENT: "warning",
  TRANSFER_IN: "secondary",
  TRANSFER_OUT: "default",
};

export default function MovementsPage() {
  const { movements, loading, loadMovements } = useInventory();
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMovements({ max: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = movements.filter((m) => {
    if (typeFilter !== "ALL" && m.type !== typeFilter) return false;
    if (search && !(m.productName || "").toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader title="Stock Movements" description="Complete audit trail of every stock change" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by product..."
          className="w-full sm:max-w-xs"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm sm:w-auto"
        >
          <option value="ALL">All Types</option>
          {Object.keys(TYPE_LABELS).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-72 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No movements yet" description="Stock changes will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Previous</th>
                    <th className="px-4 py-3 text-right font-medium">New</th>
                    <th className="px-4 py-3 font-medium">By</th>
                    <th className="px-4 py-3 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{m.productName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={TYPE_COLORS[m.type] || "default"}>
                          {TYPE_LABELS[m.type] || m.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={m.difference > 0 ? "text-green-600" : "text-red-600"}>
                          {m.difference > 0 ? "+" : ""}
                          {m.difference}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {m.previousStock}
                      </td>
                      <td className="px-4 py-3 text-right">{m.newStock}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.userName || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(m.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}