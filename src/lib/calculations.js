export const PRODUCT_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
};

export function getStockStatus(currentStock, minimumStock) {
  if (currentStock <= 0) return "OUT_OF_STOCK";
  if (currentStock <= (minimumStock || 0)) return "LOW_STOCK";
  return "IN_STOCK";
}

export function getStockStatusLabel(status) {
  return {
    OUT_OF_STOCK: "Out of Stock",
    LOW_STOCK: "Low Stock",
    IN_STOCK: "In Stock",
  }[status];
}

export function getProductTotalStock(product) {
  let total = Number(product.currentStock || 0);
  if (product.locationStock && typeof product.locationStock === "object") {
    total = Object.values(product.locationStock).reduce((sum, v) => sum + Number(v || 0), 0);
  }
  return total;
}