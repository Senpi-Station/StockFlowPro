"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Trash2,
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/hooks/useAuth";
import { completeSale, PAYMENT_METHODS } from "@/lib/sales";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";

export default function PosPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { business } = useBusiness();
  const { products, loading, loadProducts } = useProducts();
  const { customers, loadCustomers } = useCustomers();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH);
  const [discount, setDiscount] = useState("");
  const [tax, setTax] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const currency = business?.currency || "USD";
  const invoicePrefix =
    (business?.name || "INV").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "INV";

  useEffect(() => {
    loadProducts({ max: 1000 });
    loadCustomers({ max: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.status !== "ARCHIVED" &&
          Number(p.currentStock || 0) > 0 &&
          (!search ||
            (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
            (p.sku || "").toLowerCase().includes(search.toLowerCase()))
      ),
    [products, search]
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: Math.min(i.quantity + 1, product.currentStock),
                total: Math.min(i.quantity + 1, product.currentStock) * i.unitPrice,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku || "",
          unitPrice: Number(product.sellingPrice) || 0,
          quantity: 1,
          total: Number(product.sellingPrice) || 0,
          currentStock: Number(product.currentStock) || 0,
        },
      ];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const qty = Math.max(0, Math.min(i.quantity + delta, i.currentStock));
          return { ...i, quantity: qty, total: qty * i.unitPrice };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerId("");
    setDiscount("");
    setTax("");
    setNotes("");
  };

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const discountNum = Number(discount) || 0;
  const taxNum = Number(tax) || 0;
  const total = Math.max(0, subtotal - discountNum + taxNum);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    const customer = customerId
      ? customers.find((c) => c.id === customerId)
      : null;

    setBusy(true);
    try {
      const result = await completeSale(profile?.businessId, {
        items: cart.map(({ productId, productName, sku, unitPrice, quantity, total }) => ({
          productId,
          productName,
          sku,
          unitPrice,
          quantity,
          total,
        })),
        customerId: customer?.id || null,
        customerName: customer?.name || "Walk-in Customer",
        subtotal,
        discount: discountNum,
        tax: taxNum,
        total,
        paymentMethod,
        notes,
        userId: profile?.id,
        userName: profile?.fullName,
        invoicePrefix,
      });
      toast.success(`Sale ${result.invoiceNumber} completed`);
      clearCart();
      loadProducts({ max: 1000 });
      router.push("/dashboard/sales");
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
    <div className="h-full">
      <PageHeader title="Point of Sale" description="Ring up sales quickly" />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Product catalog */}
        <div className="lg:col-span-2">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No sellable products"
              description="Products in stock will appear here."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="group rounded-lg border bg-card p-3 text-left transition hover:border-primary hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 font-medium">{p.name}</p>
                    {Number(p.currentStock || 0) <= (p.minimumStock || 0) && (
                      <Badge variant="warning">Low</Badge>
                    )}
                  </div>
                  {p.sku && <p className="mt-0.5 text-xs text-muted-foreground">{p.sku}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-semibold">{formatCurrency(p.sellingPrice, currency)}</p>
                    <span className="text-xs text-muted-foreground">
                      {p.currentStock} left
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cart</span>
                <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" />
                  {cart.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Click products to add them to the cart.
                </p>
              ) : (
                <>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.productId}
                        className="rounded-md border bg-muted/30 p-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-medium">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.unitPrice, currency)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${item.productName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.productId, -1)}
                              aria-label="Decrease"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.productId, 1)}
                              disabled={item.quantity >= item.currentStock}
                              aria-label="Increase"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm font-semibold">
                            {formatCurrency(item.total, currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 border-t pt-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="customerId">Customer</Label>
                      <select
                        id="customerId"
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      >
                        <option value="">Walk-in Customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="discount">Discount</Label>
                        <Input
                          id="discount"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tax">Tax</Label>
                        <Input
                          id="tax"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={tax}
                          onChange={(e) => setTax(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <select
                        id="paymentMethod"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      >
                        {Object.entries(PAYMENT_METHODS).map(([key, value]) => (
                          <option key={key} value={value}>
                            {value.replaceAll("_", " ")}
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

                    <div className="space-y-1 border-t pt-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(subtotal, currency)}</span>
                      </div>
                      {discountNum > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="text-destructive">
                            -{formatCurrency(discountNum, currency)}
                          </span>
                        </div>
                      )}
                      {taxNum > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax</span>
                          <span>{formatCurrency(taxNum, currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatCurrency(total, currency)}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={busy || cart.length === 0}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {busy ? "Processing..." : `Charge ${formatCurrency(total, currency)}`}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}