"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSales } from "@/hooks/useSales";
import { useReturns } from "@/hooks/useReturns";
import { processReturn, RETURN_REASON_LABELS } from "@/lib/returns";
import { SALE_STATUS } from "@/lib/sales";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function ReturnsPage() {
  const { profile } = useAuth();
  const { sales, loadSales } = useSales();
  const { returns, loading, loadReturns } = useReturns();

  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadSales({ max: 200 });
    loadReturns({ max: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedSales = sales.filter((s) => s.status === SALE_STATUS.COMPLETED);
  const selectedSale = sales.find((s) => s.id === selectedSaleId);

  const selectSale = (saleId) => {
    setSelectedSaleId(saleId);
    const sale = sales.find((s) => s.id === saleId);
    const map = {};
    if (sale) (sale.items || []).forEach((item) => (map[item.productId] = 0));
    setQuantities(map);
  };

  const updateQty = (productId, value) => {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, Number(value) || 0) }));
  };

  const refundAmount = selectedSale
    ? (selectedSale.items || []).reduce((sum, item) => {
        const qty = quantities[item.productId] || 0;
        return sum + qty * Number(item.unitPrice || 0);
      }, 0)
    : 0;

  const handleSubmit = async () => {
    if (!selectedSale) {
      toast.error("Select a sale to return");
      return;
    }
    const items = (selectedSale.items || [])
      .filter((item) => (quantities[item.productId] || 0) > 0)
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: quantities[item.productId],
      }));
    if (items.length === 0) {
      toast.error("Select at least one item and quantity");
      return;
    }

    setBusy(true);
    try {
      await processReturn(profile?.businessId, {
        sale: selectedSale,
        items,
        reason,
        refundAmount,
        notes,
        userId: profile?.id,
        userName: profile?.fullName,
      });
      toast.success("Return processed, stock restored");
      setSelectedSaleId("");
      setQuantities({});
      setReason("");
      setNotes("");
      loadSales({ max: 200 });
      loadReturns({ max: 200 });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Returns & Refunds" description="Process customer returns and restore stock" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* New return */}
        <Card>
          <CardHeader>
            <CardTitle>New Return</CardTitle>
            <CardDescription>Select a completed sale to return items from.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="saleId">Original Sale</Label>
              <select
                id="saleId"
                value={selectedSaleId}
                onChange={(e) => selectSale(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Select a sale</option>
                {completedSales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.invoiceNumber} — {s.customerName} ({formatCurrency(s.total)})
                  </option>
                ))}
              </select>
            </div>

            {selectedSale && (selectedSale.items || []).length > 0 && (
              <>
                <div className="space-y-2">
                  {(selectedSale.items || []).map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity}
                        className="h-8 w-20"
                        value={quantities[item.productId] || 0}
                        onChange={(e) => updateQty(item.productId, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reason">Reason</Label>
                  <select
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Select a reason</option>
                    {Object.entries(RETURN_REASON_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Optional"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <p className="text-sm text-muted-foreground">Refund Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(refundAmount)}</p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={busy || refundAmount <= 0}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  {busy ? "Processing..." : "Process Return"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <div>
          {loading ? (
            <LoadingSkeleton className="h-72 w-full" />
          ) : returns.length === 0 ? (
            <EmptyState
              title="No returns yet"
              description="Processed returns will appear here."
            />
          ) : (
            <div className="space-y-3">
              {returns.map((r) => (
                <div key={r.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{r.invoiceNumber}</p>
                    <p className="text-sm font-medium text-destructive">
                      -{formatCurrency(r.refundAmount)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.customerName} · {RETURN_REASON_LABELS[r.reason] || r.reason}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.userName || "-"} · {formatDateTime(r.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(r.items || []).map((item, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs"
                      >
                        {item.productName} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}