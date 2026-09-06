"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { SupplierForm } from "@/components/products/supplier-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { deleteInSubcollection } from "@/lib/firestore";
import { canAccess } from "@/lib/permissions";

export default function SuppliersPage() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const canManage = canAccess(profile?.role, "suppliers");
  const { suppliers, loading, loadSuppliers, createSupplier, updateSupplier } = useSuppliers();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = suppliers.filter((s) =>
    (s.companyName || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setDialogOpen(true);
  };

  const onSubmit = async (data) => {
    setBusy(true);
    try {
      if (editing) {
        await updateSupplier(editing.id, data);
        toast.success("Supplier updated");
      } else {
        await createSupplier(data);
        toast.success("Supplier created");
      }
      setDialogOpen(false);
      loadSuppliers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteInSubcollection(businessId, "suppliers", deleting.id);
      toast.success("Supplier deleted");
      setDeleting(null);
      loadSuppliers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage the companies you buy from"
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          )
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers..."
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          description="Add suppliers to track your purchases."
          action={
            canManage && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{s.companyName}</h3>
                  {s.contactPerson && (
                    <p className="mt-1 text-sm text-muted-foreground">{s.contactPerson}</p>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-1 text-sm">
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(s)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-destructive"
                      onClick={() => setDeleting(s)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {s.email && <p>{s.email}</p>}
                {s.phone && <p>{s.phone}</p>}
                {s.address && <p>{s.address}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        title={editing ? "Edit Supplier" : "Add Supplier"}
        onClose={() => setDialogOpen(false)}
      >
        <SupplierForm initialValues={editing} onSubmit={onSubmit} busy={busy} />
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Supplier?"
        description="This will permanently remove the supplier."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        busy={busy}
      />
    </div>
  );
}