export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function nanoid(length = 16) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount || 0);
}

export function formatDate(date) {
  if (!date) return "-";
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date) {
  if (!date) return "-";
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}