"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { BusinessProvider, useBusinessContext } from "@/contexts/BusinessContext";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

function DashboardShell({ children }) {
  const { user, profile, loading: authLoading } = useAuthContext();
  const { business, loading: businessLoading } = useBusinessContext();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || businessLoading) {
    return (
      <div className="min-h-screen p-6">
        <LoadingSkeleton className="h-16 w-full mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const role = profile?.role || "STAFF";

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        role={role}
        currentBusiness={business}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <BusinessProvider>
        <DashboardShell>{children}</DashboardShell>
      </BusinessProvider>
    </AuthProvider>
  );
}