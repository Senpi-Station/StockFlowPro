// ---------------------------------------------------------------------------
// Analytics helpers — pure JS aggregation utilities shared by the dashboard,
// reports, and insights pages. Keep these free of Firebase imports so they
// are easy to unit test.
// ---------------------------------------------------------------------------

export function toDate(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = value.toDate ? value.toDate() : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date) {
  const d = startOfDay(date);
  const offset = (d.getDay() + 6) % 7; // Monday start
  d.setDate(d.getDate() - offset);
  return d;
}

export function startOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startOfYear(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), 0, 1);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function keyOf(date) {
  const d = toDate(date);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function withinRange(value, start, end) {
  const t = toDate(value);
  if (!t) return false;
  return t >= start && t <= end;
}

export function cogsOfSale(sale) {
  if (!sale || !Array.isArray(sale.items)) return 0;
  return sale.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.purchasePrice || 0),
    0
  );
}

export function itemsSoldInSale(sale) {
  if (!sale || !Array.isArray(sale.items)) return 0;
  return sale.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

/**
 * Compute today / week / month / year revenue, expenses, COGS and profit.
 */
export function computePeriodStats({ sales = [], expenses = [], now = new Date() }) {
  const ranges = {
    today: [startOfDay(now), now],
    week: [startOfWeek(now), now],
    month: [startOfMonth(now), now],
    year: [startOfYear(now), now],
  };

  const result = {};
  for (const [key, [start, end]] of Object.entries(ranges)) {
    const periodSales = sales.filter((s) => withinRange(s.createdAt, start, end));
    const revenue = periodSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const cogs = periodSales.reduce((sum, s) => sum + cogsOfSale(s), 0);
    const expensesTotal = expenses
      .filter((e) => withinRange(e.date, start, end))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    result[key] = {
      revenue,
      cogs,
      expenses: expensesTotal,
      profit: revenue - cogs - expensesTotal,
      orders: periodSales.length,
      itemsSold: periodSales.reduce((sum, s) => sum + itemsSoldInSale(s), 0),
    };
  }
  return result;
}

/**
 * Build a chronological daily series for the last `days` days.
 */
export function buildSeries({ sales = [], expenses = [], days = 14, now = new Date() }) {
  const index = {};
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = startOfDay(addDays(now, -i));
    const key = keyOf(day);
    const point = { label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: 0, expenses: 0, profit: 0 };
    index[key] = point;
    series.push(point);
  }

  for (const sale of sales) {
    const key = keyOf(sale.createdAt);
    const point = index[key];
    if (!point) continue;
    const revenue = Number(sale.total || 0);
    point.revenue += revenue;
    point.profit += revenue - cogsOfSale(sale);
  }
  for (const expense of expenses) {
    const key = keyOf(expense.date);
    const point = index[key];
    if (!point) continue;
    point.expenses += Number(expense.amount || 0);
    point.profit -= Number(expense.amount || 0);
  }
  return series;
}

/**
 * Inventory value grouped by category for a pie/bar breakdown.
 */
export function buildCategoryData(products = [], categories = []) {
  const nameOf = (id) => categories.find((c) => c.id === id)?.name || "Uncategorized";
  const map = {};
  const active = products.filter((p) => p.status !== "ARCHIVED");
  for (const p of active) {
    const name = nameOf(p.categoryId);
    const stock = Number(p.currentStock || 0);
    const value = stock * Number(p.purchasePrice || 0);
    if (!map[name]) map[name] = { name, units: 0, value: 0, count: 0 };
    map[name].units += stock;
    map[name].value += value;
    map[name].count += 1;
  }
  return Object.values(map).sort((a, b) => b.value - a.value);
}

/**
 * Aggregate all sale line items for the top products list.
 */
export function getTopProducts(sales = [], limit = 5) {
  const map = {};
  for (const sale of sales) {
    if (sale.status === "REFUNDED") continue;
    for (const item of sale.items || []) {
      const id = item.productId || item.productName;
      if (!id) continue;
      if (!map[id]) map[id] = { productId: item.productId, name: item.productName || "Unknown", quantity: 0, revenue: 0 };
      map[id].quantity += Number(item.quantity || 0);
      map[id].revenue +=
        Number(item.total || 0) || Number(item.unitPrice || 0) * Number(item.quantity || 0);
    }
  }
  return Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}

/**
 * Products with stock that have not sold for `notSoldDays` days.
 */
export function getSlowMovingProducts(products = [], sales = [], notSoldDays = 30, now = new Date()) {
  const cutoff = new Date(now.getTime() - notSoldDays * 86400000);
  const lastSale = {};
  for (const sale of sales) {
    const t = toDate(sale.createdAt);
    if (!t) continue;
    for (const item of sale.items || []) {
      if (!item.productId) continue;
      if (!lastSale[item.productId] || t > lastSale[item.productId]) lastSale[item.productId] = t;
    }
  }
  return products
    .filter((p) => p.status !== "ARCHIVED" && Number(p.currentStock || 0) > 0)
    .filter((p) => !lastSale[p.id] || lastSale[p.id] < cutoff)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || "",
      currentStock: Number(p.currentStock || 0),
      lastSoldAt: lastSale[p.id] || null,
    }));
}

/**
 * Profit and loss summary for a set of sales + expenses.
 */
export function profitLoss({ sales = [], expenses = [] }) {
  const activeSales = sales.filter(
    (s) => s.status !== "CANCELLED" && s.status !== "REFUNDED"
  );
  const revenue = activeSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const cogs = activeSales.reduce((sum, s) => sum + cogsOfSale(s), 0);
  const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  return { revenue, cogs, expenses: expensesTotal, netProfit: revenue - cogs - expensesTotal };
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export function rowsToCsv(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    return String(v).replace(/"/g, '""');
  };
  const lines = [headers.map((h) => `"${escape(h)}"`).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => `"${escape(row[h])}"`).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename, rows) {
  const csv = rowsToCsv(rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatRangeLabel(start, end) {
  const s = start ? keyOf(start) : "from";
  const e = end ? keyOf(end) : "now";
  return `${s}-${e}`;
}