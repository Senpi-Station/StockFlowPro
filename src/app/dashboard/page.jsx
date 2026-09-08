"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useBusiness } from "@/hooks/useBusiness";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { useExpenses } from "@/hooks/useExpenses";
import { useInventory } from "@/hooks/useInventory";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { getStockStatus, getStockStatusLabel } from "@/lib/calculations";
import { computePeriodStats, buildSeries, buildCategoryData, getTopProducts, getSlowMovingProducts } from "@/lib/analytics";
import { syncStockNotifications } from "@/lib/notifications";
import {
  SalesOverviewChart,
  RevenueVsExpensesChart,
  InventoryByCategoryChart,
  TopProductsChart,
} from "@/components/dashboard/charts";
import {
  PackageSearch,
  TrendingUp,
  AlertTriangle,
  ArrowDownUp,
  Plus,
  Truck,
  ShoppingBag,
  Lightbulb,
  ClipboardList,
  History,
} from "lucide-react";

const MOVEMENT_LABELS = {
  STOCK_IN: { label: "In", color: "success" },
  STOCK_OUT: { label: "Out", color: "destructive" },
  SALE: { label: "Sale", color: "destructive" },
  RETURN: { label: "Return", color: "success" },
  ADJUSTMENT: { label: "Adjust", color: "default" },
  TRANSFER_IN: { label: "Trans. In", color: "success" },
  TRANSFER_OUT: { label: "Trans. Out", color: "warning" },
  DAMAGED: { label: "Damaged", color: "destructive" },
  EXPIRED: { label: "Expired", color: "destructive" },
  LOST: { label: "Lost", color: "destructive" },
};

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
  const { profile } = useAuth();
  const { business } = useBusiness();
  const { products, loading: productsLoading, loadProducts } = useProducts();
  const { sales, loadSales } = useSales();
  const { expenses, loadExpenses } = useExpenses();
  const { movements, loadMovements } = useInventory();
  const { categories, loadCategories } = useCategories();

  useEffect(() => {
    loadProducts({ max: 1000 });
    loadCategories();
    loadSales({ max: 500 });
    loadExpenses({ max: 500 });
    loadMovements({ max: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate low/out-of-stock notifications once per load (dedupe inside helper).
  useEffect(() => {
    if (!profile?.businessId || products.length === 0) return;
    syncStockNotifications(profile.businessId, products, profile.id);
  }, [profile, products]);

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
      alerts: [...outOfStock, ...lowStock],
    };
  }, [products]);

  const analytics = useMemo(
    () => ({
      periods: computePeriodStats({ sales, expenses }),
      salesSeries: buildSeries({ sales, expenses, days: 14 }),
      revenueExpenses: buildSeries({ sales, expenses, days: 30 }),
      categoryData: buildCategoryData(products, categories),
      topProducts: getTopProducts(sales, 5).map((p) => ({
        name: p.name,
        quantity: p.quantity,
        revenue: p.revenue,
      })),
      slowMoving: getSlowMovingProducts(products, sales, 30),
    }),
    [products, sales, expenses, categories]
  );

  if (productsLoading) {
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

  const currency = business?.currency;
  const hasData = sales.length > 0 || products.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={business ? `Welcome back to ${business.name}` : "Welcome to StockFlow Pro"}
        actions={[
          <Button key="stock" asChild variant="outline" size="sm">
            <Link href="/dashboard/inventory">
              <ArrowDownUp className="mr-2 h-4 w-4" />
              Stock In/Out
            </Link>
          </Button>,
          <Button key="add" asChild size="sm">
            <Link href="/dashboard/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>,
        ]}
      />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/sales/pos">New Sale</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/suppliers">
            <Truck className="mr-2 h-4 w-4" />
            Add Supplier
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/purchases">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Create Purchase
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/insights">
            <Lightbulb className="mr-2 h-4 w-4" />
            Insights
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Products" icon={PackageSearch} value={stats.totalProducts} to="/dashboard/products" />
        <StatCard title="Units in Stock" icon={PackageSearch} value={formatNumber(stats.totalUnits)} />
        <StatCard
          title="Inventory Value"
          icon={TrendingUp}
          value={formatCurrency(stats.inventoryValue, currency)}
        />
        <StatCard
          title="Monthly Profit"
          icon={TrendingUp}
          value={formatCurrency(analytics.periods.month.profit, currency)}
          description={`Revenue ${formatCurrency(analytics.periods.month.revenue, currency)}`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          icon={ClipboardList}
          value={formatCurrency(analytics.periods.today.revenue, currency)}
          description={`${analytics.periods.today.orders} order${analytics.periods.today.orders === 1 ? "" : "s"}`}
        />
        <StatCard
          title="Monthly Sales"
          icon={ClipboardList}
          value={formatCurrency(analytics.periods.month.revenue, currency)}
          description={`${analytics.periods.month.orders} orders this month`}
        />
        <StatCard
          title="Monthly Expenses"
          icon={AlertTriangle}
          value={formatCurrency(analytics.periods.month.expenses, currency)}
        />
        <StatCard
          title="Stock Alerts"
          icon={AlertTriangle}
          value={stats.lowStockCount + stats.outOfStockCount}
          description={`${stats.lowStockCount} low, ${stats.outOfStockCount} out of stock`}
          to="/dashboard/inventory"
        />
      </div>

      {!hasData ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-sm font-semibold">Your dashboard is ready</h3>
          <p className="mt-1 mx-auto max-w-sm text-sm text-muted-foreground">
            Add products to see inventory stats, low-stock alerts, sales analytics, and insights.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/dashboard/products/new">Add Your First Product</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
                <CardDescription>Revenue vs expenses — last 14 days</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesOverviewChart data={analytics.salesSeries} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueVsExpensesChart data={analytics.revenueExpenses} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Inventory by Category</CardTitle>
                <CardDescription>Value per category</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.categoryData.length > 0 ? (
                  <InventoryByCategoryChart data={analytics.categoryData} />
                ) : (
                  <EmptyMessage text="No category data yet" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Units sold</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topProducts.length > 0 ? (
                  <TopProductsChart data={analytics.topProducts} />
                ) : (
                  <EmptyMessage text="No sales yet" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Widgets */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.alerts.length === 0 ? (
                  <EmptyMessage text="All products are healthy" />
                ) : (
                  stats.alerts.slice(0, 6).map((p) => {
                    const status = getStockStatus(p.currentStock, p.minimumStock);
                    return (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <Link
                          className="truncate font-medium hover:underline"
                          href={`/dashboard/products/${p.id}`}
                        >
                          {p.name}
                        </Link>
                        <span
                          className={`shrink-0 text-xs font-medium ${
                            status === "OUT_OF_STOCK" ? "text-red-600" : "text-amber-600"
                          }`}
                        >
                          {p.currentStock} · {getStockStatusLabel(status)}
                        </span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sales.length === 0 ? (
                  <EmptyMessage text="No sales yet" />
                ) : (
                  sales.slice(0, 6).map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.invoiceNumber}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.customerName || "Walk-in Customer"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium">{formatCurrency(s.total, currency)}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Stock Movements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {movements.length === 0 ? (
                  <EmptyMessage text="No movements yet" />
                ) : (
                  movements.map((m) => {
                    const meta = MOVEMENT_LABELS[m.type] || { label: m.type, color: "default" };
                    return (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.productName}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.reason || formatDateTime(m.createdAt)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge variant={meta.color}>{meta.label}</Badge>
                          <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Slow movers + activity link */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Slow Moving Products</CardTitle>
                <CardDescription>In stock but no sales in 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.slowMoving.length === 0 ? (
                  <EmptyMessage text="Nothing slow moving" />
                ) : (
                  <div className="space-y-3">
                    {analytics.slowMoving.slice(0, 6).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <Link
                          className="min-w-0 truncate font-medium hover:underline"
                          href={`/dashboard/products/${p.id}`}
                        >
                          {p.name}
                        </Link>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {p.currentStock} in stock · last sale {p.lastSoldAt ? formatDateTime(p.lastSoldAt) : "never"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/activity">
                    <History className="mr-2 h-4 w-4" />
                    View all
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {sales.length === 0 && products.length === 0 ? (
                  <EmptyMessage text="No activity yet" />
                ) : (
                  <div className="space-y-2 text-sm">
                    <p>Use the activity log to track every important action across your business.</p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/dashboard/activity">Open Activity Logs</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyMessage({ text }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}