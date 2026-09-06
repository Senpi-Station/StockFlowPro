"use client";

import { useBusiness } from "@/hooks/useBusiness";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageSearch, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";

function StatCard({ title, icon: Icon, description }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">—</p>
        <p className="text-xs text-muted-foreground mt-1">{description || "Data coming soon"}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { business } = useBusiness();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {business ? `Welcome back to ${business.name}` : "Welcome to StockFlow Pro"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Products" icon={PackageSearch} description="Add products to get started" />
        <StatCard title="Today's Sales" icon={ShoppingCart} description="Complete a sale to begin" />
        <StatCard title="Monthly Revenue" icon={TrendingUp} description="Revenue data will appear here" />
        <StatCard title="Low Stock Alerts" icon={AlertTriangle} description="No products yet" />
      </div>

      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-sm font-semibold">Your dashboard is ready</h3>
        <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground">
          Start by adding your products and categories. Full analytics and charts will appear as your
          business data grows.
        </p>
      </div>
    </div>
  );
}