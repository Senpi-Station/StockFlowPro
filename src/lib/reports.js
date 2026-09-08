import {
  withinRange,
  profitLoss,
  toDate,
  formatRangeLabel,
} from "./analytics";
import { getStockStatus } from "./calculations";

export const SALE_STATUS_LABELS = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const EXPENSE_LABELS = {
  RENT: "Rent",
  ELECTRICITY: "Electricity",
  SALARY: "Salary",
  TRANSPORTATION: "Transportation",
  MARKETING: "Marketing",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
};

// ---------------------------------------------------------------------------
// Row builders — one function per report type. Kept pure so the CSV export
// and the on-screen tables can share the same source of truth.
// ---------------------------------------------------------------------------

export function buildSalesReportRows(sales, { start = null, end = null } = {}) {
  return sales
    .filter((s) => (start ? withinRange(s.createdAt, start, end) : true))
    .map((s) => ({
      Date: toDate(s.createdAt)
        ? toDate(s.createdAt).toLocaleDateString("en-US")
        : "-",
      "Invoice #": s.invoiceNumber,
      Customer: s.customerName || "Walk-in Customer",
      Items: s.items ? s.items.reduce((n, i) => n + Number(i.quantity || 0), 0) : 0,
      Revenue: Number(s.total || 0).toFixed(2),
      Discount: Number(s.discount || 0).toFixed(2),
      Tax: Number(s.tax || 0).toFixed(2),
      Payment: s.paymentMethod || "-",
      Status: SALE_STATUS_LABELS[s.status] || s.status,
    }));
}

export function buildInventoryReportRows(products, categories = []) {
  const nameOf = (id) => categories.find((c) => c.id === id)?.name || "-";
  return products
    .filter((p) => p.status !== "ARCHIVED")
    .map((p) => ({
      Product: p.name,
      SKU: p.sku || "-",
      Category: nameOf(p.categoryId),
      Stock: Number(p.currentStock || 0),
      "Min Stock": Number(p.minimumStock || 0),
      "Unit Cost": Number(p.purchasePrice || 0).toFixed(2),
      "Sell Price": Number(p.sellingPrice || 0).toFixed(2),
      Value: (Number(p.currentStock || 0) * Number(p.purchasePrice || 0)).toFixed(2),
      Status: getStockStatus(p.currentStock, p.minimumStock),
    }));
}

export function buildProductsReportRows(products, categories = []) {
  const nameOf = (id) => categories.find((c) => c.id === id)?.name || "-";
  return products.map((p) => ({
    Product: p.name,
    SKU: p.sku || "-",
    Category: nameOf(p.categoryId),
    Stock: Number(p.currentStock || 0),
    "Unit Cost": Number(p.purchasePrice || 0).toFixed(2),
    "Sell Price": Number(p.sellingPrice || 0).toFixed(2),
    Status: p.status || "ACTIVE",
  }));
}

export function buildSuppliersReportRows(suppliers) {
  return suppliers.map((s) => ({
    Name: s.name,
    Contact: s.contactPerson || "-",
    Email: s.email || "-",
    Phone: s.phone || "-",
    "Total Purchases": Number(s.totalPurchases || 0),
    "Total Spent": Number(s.totalPurchaseAmount || 0).toFixed(2),
    "Last Purchase": s.lastPurchaseAt
      ? toDate(s.lastPurchaseAt)
        ? toDate(s.lastPurchaseAt).toLocaleDateString("en-US")
        : "-"
      : "-",
  }));
}

export function buildCustomersReportRows(customers) {
  return customers.map((c) => ({
    Name: c.name,
    Email: c.email || "-",
    Phone: c.phone || "-",
    Orders: Number(c.totalOrders || 0),
    "Total Spent": Number(c.totalSpent || 0).toFixed(2),
    "Last Purchase": c.lastPurchaseAt
      ? toDate(c.lastPurchaseAt)
        ? toDate(c.lastPurchaseAt).toLocaleDateString("en-US")
        : "-"
      : "-",
  }));
}

export function buildExpensesReportRows(expenses, { start = null, end = null } = {}) {
  return expenses
    .filter((e) => (start ? withinRange(e.date, start, end) : true))
    .map((e) => ({
      Date: e.date || "-",
      Category: EXPENSE_LABELS[e.category] || e.category || "-",
      Description: e.description || "-",
      Amount: Number(e.amount || 0).toFixed(2),
      "Paid By": e.userName || "-",
    }));
}

export function buildProfitLossRows(sales, expenses) {
  const onlyCompleted = sales.filter((s) => s.status === "COMPLETED");
  const { revenue, cogs, expenses: totalExpenses, netProfit } = profitLoss({
    sales: onlyCompleted,
    expenses,
  });
  const grossProfit = revenue - cogs;
  return [
    { Item: "Revenue", Amount: revenue.toFixed(2) },
    { Item: "Cost of Goods Sold", Amount: `-${cogs.toFixed(2)}` },
    { Item: "Gross Profit", Amount: grossProfit.toFixed(2) },
    { Item: "Expenses", Amount: `-${totalExpenses.toFixed(2)}` },
    { Item: "Net Profit", Amount: netProfit.toFixed(2) },
  ];
}

export { formatRangeLabel };