"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocations } from "@/hooks/useLocations";
import { useProducts } from "@/hooks/useProducts";
import { useTransfers } from "@/hooks/useTransfers";
import { createTransfer, TRANSFER_STATUS_LABELS } from "@/lib/transfers";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { formatDateTime } from "@/lib/utils";

const STATUS_COLORS = {
  PENDING: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export default function TransfersPage() {
  const { profile } = useAuth();
  const { locations, loading: locationsLoading, loadLocations, createLocation } = useLocations();
  const { products, loading: productsLoading, loadProducts } = useProducts();
  const { transfers, loading: transfersLoading, loadTransfers } = useTransfers();

  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadLocations().then((data) => {
      if (data.length === 0) {
        createLocation({ name: "Main Warehouse" })
          .then(() => loadLocations())
          .catch((error) => console.error(error));
      }
    });
    loadProducts({ max: 1000 });
    loadTransfers({ max: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return;
    setBusy(true);
    try {
      await createLocation({ name: newLocationName.trim() });
      toast.success("Location added");
      setNewLocationName("");
      setShowAddLocation(false);
      loadLocations();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleTransfer = async () => {
    if (!fromLocationId || !toLocationId) {
      toast.error("Select source and destination");
      return;
    }
    setBusy(true);
    try {
      await createTransfer(profile?.businessId, {
        fromLocationId,
        toLocationId,
        productId,
        quantity: Number(quantity),
        userId: profile?.id,
        userName: profile?.fullName,
      });
      toast.success("Transfer completed");
      setProductId("");
      setQuantity("");
      loadTransfers({ max: 200 });
      loadProducts({ max: 1000 });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div>
      <PageHeader
        title="Transfers"
        description="Move stock between your locations"
        actions={
          <Button onClick={() => setShowAddLocation((v) => !v)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        }
      />

      {showAddLocation && (
        <Card className="mb-4 max-w-md">
          <CardContent className="flex gap-2 pt-6">
            <Input
              placeholder="Location name (e.g. Shop Branch 1)"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
            />
            <Button onClick={handleAddLocation} disabled={busy || !newLocationName.trim()}>
              Add
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* New transfer */}
        <Card>
          <CardHeader>
            <CardTitle>New Transfer</CardTitle>
            <CardDescription>Move stock between two locations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationsLoading ? (
              <LoadingSkeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fromLocationId">From</Label>
                    <select
                      id="fromLocationId"
                      value={fromLocationId}
                      onChange={(e) => setFromLocationId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="">Select source</option>
                      {locations
                        .filter((l) => l.id !== toLocationId)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="toLocationId">To</Label>
                    <select
                      id="toLocationId"
                      value={toLocationId}
                      onChange={(e) => setToLocationId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="">Select destination</option>
                      {locations
                        .filter((l) => l.id !== fromLocationId)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="productId">Product</Label>
                  <select
                    id="productId"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Select product</option>
                    {products
                      .filter((p) => p.status !== "ARCHIVED")
                      .map((p) => {
                        const sourceStock =
                          p.locationStock?.[fromLocationId] ?? Number(p.currentStock || 0);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} ({sourceStock} at source)
                          </option>
                        );
                      })}
                  </select>
                </div>

                {selectedProduct && (
                  <p className="text-xs text-muted-foreground">
                    Source stock:{" "}
                    {selectedProduct.locationStock?.[fromLocationId] ??
                      Number(selectedProduct.currentStock || 0)}{" "}
                    units
                  </p>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <Button className="w-full" onClick={handleTransfer} disabled={busy}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  {busy ? "Transferring..." : "Complete Transfer"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <div>
          <h2 className="mb-3 text-sm font-semibold">Transfer History</h2>
          {transfersLoading ? (
            <LoadingSkeleton className="h-72 w-full" />
          ) : transfers.length === 0 ? (
            <EmptyState
              title="No transfers yet"
              description="Completed transfers will appear here."
            />
          ) : (
            <div className="space-y-3">
              {transfers.map((t) => {
                const from = locations.find((l) => l.id === t.fromLocationId);
                const to = locations.find((l) => l.id === t.toLocationId);
                return (
                  <div key={t.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {from?.name || "Location"} → {to?.name || "Location"}
                      </p>
                      <Badge variant={STATUS_COLORS[t.status] || "default"}>
                        {TRANSFER_STATUS_LABELS[t.status] || t.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm">{t.productName} × {t.quantity}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.userName || "-"} · {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}