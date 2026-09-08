import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
  ArrowLeftRight,
  ReceiptText,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
  BarChart3,
  Lightbulb,
  History,
  Bell,
  Settings,
} from "lucide-react";

import { canAccess } from "@/lib/permissions";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: "dashboard" },
  { href: "/dashboard/products", label: "Products", icon: Package, feature: "products" },
  { href: "/dashboard/categories", label: "Categories", icon: Tags, feature: "products" },
  { href: "/dashboard/inventory", label: "Inventory", icon: Warehouse, feature: "inventory" },
  { href: "/dashboard/inventory/movements", label: "Stock Movements", icon: ArrowLeftRight, feature: "inventory" },
  { href: "/dashboard/inventory/transfers", label: "Transfers", icon: ArrowLeftRight, feature: "inventory" },
  { href: "/dashboard/sales", label: "Sales", icon: ReceiptText, feature: "sales" },
  { href: "/dashboard/sales/pos", label: "POS", icon: ShoppingCart, feature: "pos" },
  { href: "/dashboard/purchases", label: "Purchases", icon: ShoppingBag, feature: "purchases" },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: Truck, feature: "suppliers" },
  { href: "/dashboard/customers", label: "Customers", icon: Users, feature: "customers" },
  { href: "/dashboard/expenses", label: "Expenses", icon: Wallet, feature: "reports" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, feature: "reports" },
  { href: "/dashboard/insights", label: "Insights", icon: Lightbulb, feature: "reports" },
  { href: "/dashboard/activity", label: "Activity Logs", icon: History, feature: "reports" },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, feature: "dashboard" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, feature: "dashboard" },
];

export function getNavItems(role) {
  return NAV_ITEMS.filter((item) => canAccess(role, item.feature));
}