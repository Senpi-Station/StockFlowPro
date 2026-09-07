"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, PackageCheck, XCircle, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePurchases } from "@/hooks/usePurchases";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { createPurchase, receivePurchase, cancelPurchase, PURCHASE_STATUS_LABELS } from "@/lib/purchases";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const STATUS_COLORS = {
  DRAFT: "secondary",
  ORDERED: "warning",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "destructive",
};

export default function PurchasesPage() {
  const { profile } = useAuth();
  const { purchases, loading, loadPurchases } = usePurchases();
  const { products, loadProducts } = useProducts();
  const { suppliers, loadSuppliers } = useSuppliers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [receiving, setReceiving] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadPurchases({ max: 200 });
    loadProducts({ max: 1000 });
    loadSuppliers({ max: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (data) => {
    setBusy(true);
    try {
      const supplier = data.supplierId
        ? suppliers.find((s) => s.id === data.supplierId)
        : null;
      await createPurchase(profile?.businessId, {
        ...data,
        supplierName: supplier?.companyName || null,
        userId: profile?.id,
        userName: profile?.fullName,
      });
      toast.success("Purchase order created");
      setDialogOpen(false);
      loadPurchases({ max: 200 });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReceive = async () => {
    if (!receiving) return;
    setBusy(true);
    try {
      await receivePurchase(profile?.businessId, receiving, {
        userId: profile?.id,
        userName: profile?.fullName,
      });
      toast.success("Purchase received, stock updated");
      setReceiving(null);
      loadPurchases({ max: 200 });
      loadProducts({ max: 1000 });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      await cancelPurchase(profile?.businessId, cancelling.id, {
        userId: profile?.id,
        userName: profile?.fullName,
      });
      toast.success("Purchase cancelled");
      setCancelling(null);
      loadPurchases({ max: 200 });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Purchase orders and receiving"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        }
      />

      {loading ? (
        <LoadingSkeleton className="h-72 w-full" />
      ) : purchases.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          description="Create a purchase order for your suppliers."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Purchase
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 text-right font-medium">Items</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{p.supplierName}</td>
                    <td className="px-4 py-3 text-right">{(p.items || []).length}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(p.subtotal)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[p.status] || "default"}>
                        {PURCHASE_STATUS_LABELS[p.status] || p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDetail(p)}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                        {p.status === "ORDERED" && (
                          <Button variant="ghost" size="sm" onClick={() => setReceiving(p)}>
                            <PackageCheck className="mr-1 h-3.5 w-3.5" />
                            Receive
                          </Button>
                        )}
                        {["DRAFT", "ORDERED", "PARTIALLY_RECEIVED"].includes(p.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setCancelling(p)}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        title="New Purchase Order"
        onClose={() => setDialogOpen(false)}
        size="lg"
      >
        <PurchaseForm
          products={products}
          suppliers={suppliers}
          onSubmit={handleCreate}
          busy={busy}
        />
      </FormDialog>

      <FormDialog
        open={!!detail}
        title={`Purchase — ${detail?.supplierName}`}
        description={detail && formatDateTime(detail.createdAt)}
        onClose={() => setDetail(null)}
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.items || []).map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <p className="text-sm font-semibold">
                Total: {formatCurrency(detail.subtotal)}
              </p>
            </div>
            {detail.notes && (
              <p className="text-sm text-muted-foreground">Note: {detail.notes}</p>
            )}
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!receiving}
        title="Receive this purchase?"
        description="Stock will be added to inventory and the purchase marked as received."
        confirmLabel="Receive"
        onConfirm={handleReceive}
        onCancel={() => setReceiving(null)}
        busy={busy}
      />

      <ConfirmDialog
        open={!!cancelling}
        title="Cancel purchase?"
        description="This purchase order will be cancelled."
        confirmLabel="Cancel"
        destructive
        onConfirm={handleCancel}
        onCancel={() => setCancelling(null)}
        busy={busy}
      />
    </div>
  );
}