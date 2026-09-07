"use client";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function TransfersPage() {
  return (
    <div>
      <PageHeader title="Transfers" description="Move stock between locations" />
      <EmptyState
        title="No transfers yet"
        description="Stock transfers between your locations will appear here."
      />
    </div>
  );
}