"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useBusiness } from "@/hooks/useBusiness";
import { useProducts } from "@/hooks/useProducts";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PackageSearch,
  TrendingUp,
  AlertTriangle,
  ArrowDownUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getStockStatus, getStockStatusLabel } from "@/lib/calculations";

function StatCard({ title, icon: Icon, value, description, to }) {
  const content = (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link href={to} className="block h-full">{content}</Link> : content;
}

export default function DashboardPage() {
  const { business } = useBusiness();
  const { products, loading, loadProducts } = useProducts();

  useEffect(() => {
    loadProducts({ max: 1000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status !== "ARCHIVED");
    const totalProducts = active.length;
    const totalUnits = active.reduce((s, p) => s + Number(p.currentStock || 0), 0);
    const inventoryValue = active.reduce(
      (s, p) => s + Number(p.currentStock || 0) * Number(p.purchasePrice || 0),
      0
    );
    const lowStock = active.filter(
      (p) => getStockStatus(p.currentStock, p.minimumStock) === "LOW_STOCK"
    );
    const outOfStock = active.filter(
      (p) => getStockStatus(p.currentStock, p.minimumStock) === "OUT_OF_STOCK"
    );
    return {
      totalProducts,
      totalUnits,
      inventoryValue,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStock,
      outOfStock,
    };
  }, [products]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const alerts = [...stats.outOfStock, ...stats.lowStock];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {business ? `Welcome back to ${business.name}` : "Welcome to StockFlow Pro"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/inventory">
              <ArrowDownUp className="mr-2 h-4 w-4" />
              Stock In/Out
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/products/new">Add Product</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Products" icon={PackageSearch} value={stats.totalProducts} to="/dashboard/products" />
        <StatCard title="Units in Stock" icon={PackageSearch} value={stats.totalUnits} />
        <StatCard
          title="Inventory Value"
          icon={TrendingUp}
          value={formatCurrency(stats.inventoryValue, business?.currency)}
        />
        <StatCard
          title="Stock Alerts"
          icon={AlertTriangle}
          value={stats.lowStockCount + stats.outOfStockCount}
          description={`${stats.lowStockCount} low, ${stats.outOfStockCount} out of stock`}
          to="/dashboard/inventory"
        />
      </div>

      {alerts.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Stock Alerts</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Min</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 8).map((p) => {
                  const status = getStockStatus(p.currentStock, p.minimumStock);
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        <Link className="hover:underline" href={`/dashboard/products/${p.id}`}>
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium ${
                            status === "OUT_OF_STOCK" ? "text-red-600" : "text-amber-600"
                          }`}
                        >
                          {getStockStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{p.currentStock}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {p.minimumStock || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-sm font-semibold">Your dashboard is ready</h3>
          <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground">
            Add products to see inventory stats, low-stock alerts, and sales analytics.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/dashboard/products/new">Add Your First Product</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}