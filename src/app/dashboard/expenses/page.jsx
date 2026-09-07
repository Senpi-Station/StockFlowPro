"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useExpenses } from "@/hooks/useExpenses";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  ExpenseForm,
} from "@/components/expenses/expense-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ExpensesPage() {
  const { profile } = useAuth();
  const { expenses, loading, loadExpenses, createExpense, updateExpense, deleteExpense } =
    useExpenses();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadExpenses({ max: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (categoryFilter === "ALL" ? expenses : expenses.filter((e) => e.category === categoryFilter)),
    [expenses, categoryFilter]
  );

  const totals = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = expenses
      .filter((e) => new Date(e.date).getTime() >= startOfMonth.getTime())
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const all = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    return { thisMonth, all };
  }, [expenses]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (e) => {
    setEditing(e);
    setDialogOpen(true);
  };

  const onSubmit = async (data) => {
    setBusy(true);
    try {
      if (editing) {
        await updateExpense(editing.id, { ...data, createdBy: profile?.fullName || "" });
        toast.success("Expense updated");
      } else {
        await createExpense({ ...data, createdBy: profile?.fullName || "" });
        toast.success("Expense added");
      }
      setDialogOpen(false);
      loadExpenses({ max: 500 });
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
      await deleteExpense(deleting.id);
      toast.success("Expense deleted");
      setDeleting(null);
      loadExpenses({ max: 500 });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const categoryTotals = useMemo(() => {
    const map = {};
    for (const cat of Object.values(EXPENSE_CATEGORIES)) map[cat] = 0;
    for (const e of expenses) map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    return map;
  }, [expenses]);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track your business expenses"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totals.thisMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totals.all)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Top Category</p>
            <p className="mt-1 text-2xl font-bold">
              {EXPENSE_CATEGORY_LABELS[
                Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0]
              ] || "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Expense Count</p>
            <p className="mt-1 text-2xl font-bold">{expenses.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm sm:w-56"
        >
          <option value="ALL">All Categories</option>
          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-72 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No expenses yet"
          description="Add your first expense to start tracking."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{e.title}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {EXPENSE_CATEGORY_LABELS[e.category] || e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-destructive">
                      -{formatCurrency(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(e.paymentMethod || "").replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          className="text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(e)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-sm text-destructive"
                          onClick={() => setDeleting(e)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        title={editing ? "Edit Expense" : "Add Expense"}
        onClose={() => setDialogOpen(false)}
      >
        <ExpenseForm initialValues={editing} onSubmit={onSubmit} busy={busy} />
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Expense?"
        description="This will permanently remove the expense record."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        busy={busy}
      />
    </div>
  );
}