"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MoveUpRight, MoveDownLeft, SlidersHorizontal, Plus } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { applyStockChange, adjustStock, MOVEMENT_TYPES } from "@/lib/inventory";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { canAccess } from "@/lib/permissions";

const stockSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  reason: z.string().optional(),
});

const adjustSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  actualStock: z.coerce.number().min(0, "Actual stock cannot be negative"),
  reason: z.string().optional(),
});

export default function InventoryPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { products, loading, loadProducts } = useProducts();
  const [busy, setBusy] = useState(false);
  const [activeForm, setActiveForm] = useState("IN");

  const canManage = canAccess(profile?.role, "inventory");

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stockForm = useForm({
    resolver: zodResolver(stockSchema),
    defaultValues: { productId: "", quantity: 1, reason: "" },
  });

  const adjustForm = useForm({
    resolver: zodResolver(adjustSchema),
    defaultValues: { productId: "", actualStock: 0, reason: "" },
  });

  const onStockSubmit = async (data) => {
    setBusy(true);
    try {
      const type =
        activeForm === "IN" ? MOVEMENT_TYPES.STOCK_IN : MOVEMENT_TYPES.STOCK_OUT;
      const quantity = activeForm === "IN" ? Math.abs(data.quantity) : -Math.abs(data.quantity);
      await applyStockChange(profile?.businessId, {
        productId: data.productId,
        quantity,
        type,
        reason: data.reason || "",
        userId: profile?.id,
        userName: profile?.fullName,
      });
      toast.success(activeForm === "IN" ? "Stock added" : "Stock removed");
      stockForm.reset({ productId: "", quantity: 1, reason: "" });
      loadProducts();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const onAdjustSubmit = async (data) => {
    setBusy(true);
    try {
      await adjustStock(profile?.businessId, {
        productId: data.productId,
        actualStock: data.actualStock,
        reason: data.reason || "",
        userId: profile?.id,
        userName: profile?.fullName,
      });
      toast.success("Stock adjusted");
      adjustForm.reset({ productId: "", actualStock: 0, reason: "" });
      loadProducts();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton className="h-96 w-full" />;
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Manage stock levels and movements"
        actions={
          canManage && (
            <Button onClick={() => router.push("/dashboard/products/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          )
        }
      />

      <div className="mb-6 flex gap-2 flex-wrap">
        {[
          { key: "IN", label: "Stock In", icon: MoveUpRight },
          { key: "OUT", label: "Stock Out", icon: MoveDownLeft },
          { key: "ADJUST", label: "Adjust Stock", icon: SlidersHorizontal },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeForm === key ? "default" : "outline"}
            onClick={() => setActiveForm(key)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {activeForm === "ADJUST" ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Stock Adjustment</CardTitle>
            <CardDescription>
              Enter the actual on-hand count. The difference is recorded automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="productId">Product</Label>
                <select
                  id="productId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  {...adjustForm.register("productId")}
                >
                  <option value="">Select a product</option>
                  {products
                    .filter((p) => p.status !== "ARCHIVED")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (currently {p.currentStock})
                      </option>
                    ))}
                </select>
                {adjustForm.formState.errors.productId && (
                  <p className="text-xs text-destructive">
                    {adjustForm.formState.errors.productId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="actualStock">Actual Stock Count</Label>
                <Input
                  id="actualStock"
                  type="number"
                  min="0"
                  {...adjustForm.register("actualStock")}
                />
                {adjustForm.formState.errors.actualStock && (
                  <p className="text-xs text-destructive">
                    {adjustForm.formState.errors.actualStock.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Input id="reason" {...adjustForm.register("reason")} placeholder="Optional" />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Adjusting..." : "Adjust Stock"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{activeForm === "IN" ? "Stock In" : "Stock Out"}</CardTitle>
            <CardDescription>
              {activeForm === "IN"
                ? "Add stock to a product's inventory"
                : "Remove stock from a product's inventory"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={stockForm.handleSubmit(onStockSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="productId">Product</Label>
                <select
                  id="productId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  {...stockForm.register("productId")}
                >
                  <option value="">Select a product</option>
                  {products
                    .filter((p) => p.status !== "ARCHIVED")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (currently {p.currentStock})
                      </option>
                    ))}
                </select>
                {stockForm.formState.errors.productId && (
                  <p className="text-xs text-destructive">
                    {stockForm.formState.errors.productId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  {...stockForm.register("quantity")}
                />
                {stockForm.formState.errors.quantity && (
                  <p className="text-xs text-destructive">
                    {stockForm.formState.errors.quantity.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  {...stockForm.register("reason")}
                  placeholder={activeForm === "IN" ? "e.g. New delivery" : "e.g. Damage"}
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Processing..."
                  : activeForm === "IN"
                  ? "Add Stock"
                  : "Remove Stock"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}