"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { useSales } from "@/hooks/useSales";
import { useExpenses } from "@/hooks/useExpenses";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCustomers } from "@/hooks/useCustomers";
import { useCategories } from "@/hooks/useCategories";
import {
  buildSalesReportRows,
  buildInventoryReportRows,
  buildProductsReportRows,
  buildSuppliersReportRows,
  buildCustomersReportRows,
  buildExpensesReportRows,
  buildProfitLossRows,
} from "@/lib/reports";
import { downloadCsv, formatRangeLabel, withinRange } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "sales", label: "Sales" },
  { value: "inventory", label: "Inventory" },
  { value: "products", label: "Products" },
  { value: "suppliers", label: "Suppliers" },
  { value: "customers", label: "Customers" },
  { value: "expenses", label: "Expenses" },
  { value: "profit", label: "Profit & Loss" },
];

const DEFAULT_RANGE = (() => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { preset: "month", label: "this month", start, end: now };
})();

export default function ReportsPage() {
  const { sales, loading: salesLoading, loadSales } = useSales();
  const { expenses, loading: expensesLoading, loadExpenses } = useExpenses();
  const { products, loading: productsLoading, loadProducts } = useProducts();
  const { suppliers, loadSuppliers } = useSuppliers();
  const { customers, loadCustomers } = useCustomers();
  const { categories, loadCategories } = useCategories();

  const [tab, setTab] = useState("sales");
  const [range, setRange] = useState(DEFAULT_RANGE);

  useEffect(() => {
    loadSales({ max: 500 });
    loadExpenses({ max: 500 });
    loadProducts({ max: 1000 });
    loadSuppliers();
    loadCustomers({ max: 1000 });
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = salesLoading || expensesLoading || productsLoading;

  const rows = useMemo(() => {
    const { start, end } = range;
    switch (tab) {
      case "inventory":
        return buildInventoryReportRows(products, categories);
      case "products":
        return buildProductsReportRows(products, categories);
      case "suppliers":
        return buildSuppliersReportRows(suppliers);
      case "customers":
        return buildCustomersReportRows(customers);
      case "expenses":
        return buildExpensesReportRows(expenses, { start, end });
      case "profit":
        return buildProfitLossRows(
          sales.filter((s) => (start ? withinRange(s.createdAt, start, end) : true)),
          expenses.filter((e) => (start ? withinRange(e.date, start, end) : true))
        );
      case "sales":
      default:
        return buildSalesReportRows(sales, { start, end });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, range, sales, expenses, products, suppliers, customers, categories]);

  const handleExport = () => {
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    downloadCsv(`report-${tab}-${formatRangeLabel(range.start, range.end)}.csv`, rows);
    toast.success("Report exported");
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analyze your business and export to CSV"
        actions={
          <Button onClick={handleExport} disabled={loading || rows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.value}
            type="button"
            size="sm"
            variant={tab === t.value ? "default" : "outline"}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {TABS.find((t) => t.value === tab)?.label}
            {tab !== "inventory" && tab !== "products" && tab !== "suppliers" && tab !== "customers" && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {range.label}
              </span>
            )}
          </CardTitle>
          <DateRangePicker value={range} onChange={setRange} />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <LoadingSkeleton className="h-48 w-full" />
          ) : rows.length === 0 ? (
            <EmptyState title="No data" description="There is nothing to report for this selection yet." />
          ) : (
            <ReportTable rows={rows} tab={tab} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTable({ rows, tab }) {
  const headers = Object.keys(rows[0]);
  return (
    <table className="w-full min-w-[640px] text-sm">
      <thead>
        <tr className="border-b bg-muted/50 text-left">
          {headers.map((h) => (
            <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={cn("border-b last:border-0", tab === "profit" && "font-medium")}>
            {headers.map((h) => (
              <td key={h} className="px-3 py-2.5 whitespace-nowrap">
                {row[h]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}