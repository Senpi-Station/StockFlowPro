"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHODS } from "@/lib/sales";

export const EXPENSE_CATEGORIES = {
  RENT: "RENT",
  ELECTRICITY: "ELECTRICITY",
  SALARY: "SALARY",
  TRANSPORTATION: "TRANSPORTATION",
  MARKETING: "MARKETING",
  MAINTENANCE: "MAINTENANCE",
  OTHER: "OTHER",
};

export const EXPENSE_CATEGORY_LABELS = {
  RENT: "Rent",
  ELECTRICITY: "Electricity",
  SALARY: "Salary",
  TRANSPORTATION: "Transportation",
  MARKETING: "Marketing",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
};

const expenseSchema = z.object({
  title: z.string().min(2, "Title is required"),
  category: z.string().min(1, "Select a category"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  date: z.string().min(1, "Date is required"),
  paymentMethod: z.string().min(1, "Select a payment method"),
  notes: z.string().optional(),
});

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ExpenseForm({ initialValues, onSubmit, busy = false }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      category: "",
      amount: "",
      date: todayString(),
      paymentMethod: PAYMENT_METHODS.CASH,
      notes: "",
    },
  });

  useEffect(() => {
    if (initialValues) reset(initialValues);
  }, [initialValues, reset]);

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="e.g. Monthly rent" {...register("title")} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            {...register("category")}
          >
            <option value="">Select category</option>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" min="0" step="0.01" placeholder="0.00" {...register("amount")} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <select
            id="paymentMethod"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            {...register("paymentMethod")}
          >
            {Object.entries(PAYMENT_METHODS).map(([key, value]) => (
              <option key={key} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          {...register("notes")}
        />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving..." : "Save Expense"}
      </Button>
    </form>
  );
}