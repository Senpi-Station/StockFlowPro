"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { generateInsights } from "@/lib/insights";

const SEVERITY_META = {
  critical: { label: "Critical", icon: AlertOctagon, color: "destructive" },
  warning: { label: "Warning", icon: AlertTriangle, color: "warning" },
  info: { label: "Info", icon: CheckCircle2, color: "success" },
};

export default function InsightsPage() {
  const { products, loading: productsLoading, loadProducts } = useProducts();
  const { sales, loadSales } = useSales();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProducts({ max: 1000 }).then(() => loadSales({ max: 500 })).then(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insights = useMemo(() => generateInsights({ products, sales }), [products, sales]);

  const grouped = useMemo(() => ({
    critical: insights.filter((i) => i.severity === "critical"),
    warning: insights.filter((i) => i.severity === "warning"),
    info: insights.filter((i) => i.severity === "info"),
  }), [insights]);

  const loading = productsLoading || !loaded;

  return (
    <div>
      <PageHeader
        title="Insights"
        description="Rule-based recommendations generated from your sales and inventory data"
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <LoadingSkeleton className="h-64 w-full" />
          <LoadingSkeleton className="h-64 w-full" />
          <LoadingSkeleton className="h-64 w-full" />
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          title="No insights yet"
          description="Add products and make a few sales — insights will appear here automatically."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {["critical", "warning", "info"].map((severity) => {
            const items = grouped[severity];
            const meta = SEVERITY_META[severity];
            const Icon = meta.icon;
            return (
              <div key={severity}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h2 className="text-sm font-semibold">{meta.label}</h2>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <Card>
                      <CardContent className="py-6 text-center text-sm text-muted-foreground">
                        All clear
                      </CardContent>
                    </Card>
                  ) : (
                    items.slice(0, 12).map((insight, i) => (
                      <Card key={`${insight.productId}-${insight.type}-${i}`}>
                        <CardHeader className="pb-2">
                          <Badge variant={meta.color} className="w-fit">
                            {meta.label}
                          </Badge>
                          <CardTitle className="mt-2 text-base">{insight.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                          {insight.productId && (
                            <Button asChild variant="link" size="sm" className="mt-2 px-0">
                              <Link href={`/dashboard/products/${insight.productId}`}>View product</Link>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}