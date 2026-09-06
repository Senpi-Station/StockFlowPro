"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStockStatus, getStockStatusLabel } from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";

function StockBadge({ currentStock, minimumStock }) {
  const status = getStockStatus(currentStock, minimumStock);
  const variant = status === "IN_STOCK" ? "success" : status === "LOW_STOCK" ? "warning" : "destructive";
  return <Badge variant={variant}>{getStockStatusLabel(status)}</Badge>;
}

export function ProductTable({
  products,
  onEdit,
  onArchive,
  onRestore,
  currency = "USD",
  loading = false,
}) {
  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading products...</p>;
  }

  if (!products.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No products found. Add your first product to get started.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">SKU</th>
            <th className="px-4 py-3 text-left font-medium">Stock</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Selling Price</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.sku || "-"}</td>
              <td className="px-4 py-3">{p.currentStock}</td>
              <td className="px-4 py-3">
                <StockBadge currentStock={p.currentStock} minimumStock={p.minimumStock} />
              </td>
              <td className="px-4 py-3 text-right">{formatCurrency(p.sellingPrice, currency)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(p)}>
                    Edit
                  </Button>
                  {p.status === "ARCHIVED" ? (
                    <Button variant="ghost" size="sm" onClick={() => onRestore(p.id)}>
                      Restore
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => onArchive(p.id)}>
                      Archive
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { StockBadge };