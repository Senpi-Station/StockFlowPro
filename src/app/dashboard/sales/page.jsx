"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Undo2 } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { FormDialog } from "@/components/ui/form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const STATUS_LABELS = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const STATUS_COLORS = {
  COMPLETED: "success",
  PENDING: "warning",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
};

export default function SalesPage() {
  const { sales, loading, loadSales } = useSales();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadSales({ max: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = sales.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (
      search &&
      !(s.invoiceNumber || "").toLowerCase().includes(search.toLowerCase()) &&
      !(s.customerName || "").toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Sales"
        description="View and manage your sales"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/sales/returns">
                <Undo2 className="mr-2 h-4 w-4" />
                Returns
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/sales/pos">
                <Plus className="mr-2 h-4 w-4" />
                New Sale
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by invoice or customer..."
          className="w-full sm:max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm sm:w-auto"
        >
          <option value="ALL">All Statuses</option>
          {Object.keys(STATUS_LABELS).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-72 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No sales yet"
          description="Create your first sale at the POS."
          action={
            <Button asChild>
              <Link href="/dashboard/sales/pos">Open POS</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                    onClick={() => setSelected(s)}
                  >
                    <td className="px-4 py-3 font-medium">{s.invoiceNumber}</td>
                    <td className="px-4 py-3">{s.customerName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[s.status] || "default"}>
                        {STATUS_LABELS[s.status] || s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(s.paymentMethod || "").replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(s.total)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.createdBy || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FormDialog
        open={!!selected}
        title={selected?.invoiceNumber}
        description={selected && formatDateTime(selected.createdAt)}
        onClose={() => setSelected(null)}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium">{selected.customerName}</p>
                {selected.customerId && (
                  <p className="text-muted-foreground">Customer ID: {selected.customerId}</p>
                )}
              </div>
              <Badge variant={STATUS_COLORS[selected.status] || "default"}>
                {STATUS_LABELS[selected.status] || selected.status}
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Price</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items || []).map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(selected.subtotal)}</span>
              </div>
              {Number(selected.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">-{formatCurrency(selected.discount)}</span>
                </div>
              )}
              {Number(selected.tax) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(selected.tax)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(selected.total)}</span>
              </div>
            </div>

            {selected.notes && (
              <p className="text-sm text-muted-foreground">Note: {selected.notes}</p>
            )}
          </div>
        )}
      </FormDialog>
    </div>
  );
}