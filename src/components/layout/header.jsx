"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, ChevronDown, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/firebase-auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Header({ onMenuClick }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="flex h-16 items-center border-b border-border bg-card/50 px-4 sm:px-6">
      <button className="lg:hidden mr-3" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex flex-1 items-center justify-end">
        <div className="relative">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </span>
            <span className="hidden sm:inline text-sm">
              {profile?.fullName || "Account"}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-popover p-1 shadow-md">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-accent"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}