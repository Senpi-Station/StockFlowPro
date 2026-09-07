"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCustomers } from "@/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { CustomerForm } from "@/components/customers/customer-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { canAccess } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";

export default function CustomersPage() {
  const { profile } = useAuth();
  const canManage = canAccess(profile?.role, "customers");
  const { customers, loading, loadCustomers, createCustomer, updateCustomer, deleteCustomer } =
    useCustomers();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = customers.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setDialogOpen(true);
  };

  const onSubmit = async (data) => {
    setBusy(true);
    try {
      if (editing) {
        await updateCustomer(editing.id, data);
        toast.success("Customer updated");
      } else {
        await createCustomer(data);
        toast.success("Customer created");
      }
      setDialogOpen(false);
      loadCustomers();
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
      await deleteCustomer(deleting.id);
      toast.success("Customer deleted");
      setDeleting(null);
      loadCustomers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customers and track their purchases"
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          )
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customers..."
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <LoadingSkeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add customers to track them at your POS."
          action={
            canManage && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  {c.email && <p className="mt-1 text-sm text-muted-foreground">{c.email}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-1 text-sm">
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </button>
                    <button className="text-destructive" onClick={() => setDeleting(c)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {c.phone && <p>Phone: {c.phone}</p>}
                {c.address && <p>{c.address}</p>}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{c.totalOrders || 0} orders</p>
                </div>
                <p className="font-medium">
                  {formatCurrency(c.totalSpent || 0)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        title={editing ? "Edit Customer" : "Add Customer"}
        onClose={() => setDialogOpen(false)}
      >
        <CustomerForm initialValues={editing} onSubmit={onSubmit} busy={busy} />
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Customer?"
        description="This will remove the customer. Their sales history is kept."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        busy={busy}
      />
    </div>
  );
}