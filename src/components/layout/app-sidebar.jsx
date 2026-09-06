"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PackageSearch, X } from "lucide-react";
import { getNavItems } from "@/constants";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function AppSidebar({ role = "ADMIN", currentBusiness, onClose, open }) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={onClose}>
            <PackageSearch className="h-6 w-6 text-primary" />
            <span>StockFlow Pro</span>
          </Link>
          <button className="lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        {currentBusiness && (
          <div className="px-6 py-3">
            <p className="truncate text-sm font-medium">{currentBusiness.name}</p>
          </div>
        )}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {getNavItems(role).map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}