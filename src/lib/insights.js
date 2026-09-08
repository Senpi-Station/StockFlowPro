import { getStockStatus } from "./calculations";
import { toDate, startOfDay, addDays } from "./analytics";

export const INSIGHT_TYPES = {
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  NOT_SOLD_30_DAYS: "NOT_SOLD_30_DAYS",
  SLOW_MOVING: "SLOW_MOVING",
  SELLING_FAST: "SELLING_FAST",
  SALES_UP: "SALES_UP",
  DEAD_STOCK: "DEAD_STOCK",
};

/**
 * Rule-based insights. No AI required.
 *
 * Inputs:
 *  - products: product docs
 *  - sales: sale docs (createdAt Timestamp + items[])
 *
 * Returns an array of insights sorted by severity.
 */
export function generateInsights({ products = [], sales = [], now = new Date() }) {
  const insights = [];

  // Index sale line items per product.
  const byProduct = {};
  for (const sale of sales) {
    if (sale.status === "CANCELLED") continue;
    const t = toDate(sale.createdAt);
    if (!t) continue;
    for (const item of sale.items || []) {
      if (!item.productId) continue;
      const rec =
        byProduct[item.productId] ||
        (byProduct[item.productId] = {
          productId: item.productId,
          productName: item.productName || "",
          quantity: 0,
          revenue: 0,
          count: 0,
          lastSoldAt: null,
          dates: [],
        });
      rec.quantity += Number(item.quantity || 0);
      rec.revenue += Number(item.total || 0);
      rec.count += 1;
      rec.dates.push(t);
      if (!rec.lastSoldAt || t > rec.lastSoldAt) rec.lastSoldAt = t;
    }
  }

  const thirtyDaysAgo = addDays(now, -30);
  const last7 = startOfDay(now); // floor for "last 7 days" comparisons
  const severityRank = { critical: 0, warning: 1, info: 2 };

  for (const product of products) {
    if (product.status === "ARCHIVED") continue;
    const stock = Number(product.currentStock || 0);
    const minimum = Number(product.minimumStock || 0);
    const status = getStockStatus(stock, minimum);
    const rec = byProduct[product.id] || null;

    if (stock === 0) {
      insights.push({
        type: INSIGHT_TYPES.OUT_OF_STOCK,
        severity: "critical",
        productId: product.id,
        title: `${product.name} is out of stock`,
        description: "This product has zero stock and cannot be sold.",
      });
    } else if (status === "LOW_STOCK") {
      insights.push({
        type: INSIGHT_TYPES.LOW_STOCK,
        severity: "warning",
        productId: product.id,
        title: `${product.name} is running low`,
        description: `${stock} unit${stock === 1 ? "" : "s"} remaining (minimum ${minimum}). Reorder soon.`,
      });
    }

    if (rec && rec.lastSoldAt) {
      if (rec.lastSoldAt < thirtyDaysAgo && stock > 0) {
        insights.push({
          type: INSIGHT_TYPES.NOT_SOLD_30_DAYS,
          severity: "warning",
          productId: product.id,
          title: `${product.name} has not sold in 30 days`,
          description: `Last sold on ${rec.lastSoldAt.toLocaleDateString()}. It still has ${stock} units in stock.`,
        });
      }

      // Compare last 7 days vs the 7 days before that.
      const last7Qty = rec.dates.filter((d) => d >= addDays(last7, -7)).length;
      const prev7Qty = rec.dates.filter((d) => d >= addDays(last7, -14) && d < addDays(last7, -7)).length;

      if (last7Qty > 0 && last7Qty >= prev7Qty * 2) {
        insights.push({
          type: INSIGHT_TYPES.SALES_UP,
          severity: "info",
          productId: product.id,
          title: `${product.name} sales are up`,
          description: `Sold in the last 7 days — more than double the previous week. Stay stocked.`,
        });
      }

      if (rec.dates.length >= 10 && rec.lastSoldAt >= addDays(now, -7)) {
        insights.push({
          type: INSIGHT_TYPES.SELLING_FAST,
          severity: "info",
          productId: product.id,
          title: `${product.name} is selling quickly`,
          description: `${rec.quantity} unit${rec.quantity === 1 ? "" : "s"} sold recently. Review pricing and reorder levels.`,
        });
      }
    } else if (stock > 0) {
      insights.push({
        type: INSIGHT_TYPES.SLOW_MOVING,
        severity: "info",
        productId: product.id,
        title: `${product.name} has never sold`,
        description: `It has ${stock} units in stock but no sale history yet.`,
      });
    }
  }

  return insights.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}