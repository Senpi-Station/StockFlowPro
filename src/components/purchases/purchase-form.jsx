"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const itemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unitCost: z.coerce.number().min(0, "Cost cannot be negative"),
});

const purchaseSchema = z.object({
  supplierId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Add at least one product"),
});

export function PurchaseForm({ products, suppliers, initialValues, onSubmit, busy = false }) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: "",
      notes: "",
      items: [{ productId: "", quantity: 1, unitCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    if (initialValues) reset(initialValues);
  }, [initialValues, reset]);

  // Visible total
  const visibleTotal = fields.reduce((sum, field, i) => {
    const qty = Number(field?.quantity || 0);
    const cost = Number(field?.unitCost || 0);
    return sum + qty * cost;
  }, 0);

  return (
    <form
      onSubmit={handleSubmit((data) =>
        onSubmit({
          ...data,
          supplierId: data.supplierId || null,
          items: data.items.map((item) => ({
            productId: item.productId,
            productName: products.find((p) => p.id === item.productId)?.name || "",
            sku: products.find((p) => p.id === item.productId)?.sku || "",
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
          })),
        })
      )}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="supplierId">Supplier</Label>
        <select
          id="supplierId"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          {...register("supplierId")}
        >
          <option value="">Select a supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.companyName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Products</Label>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-md border bg-muted/30 p-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    {...register(`items.${index}.productId`)}
                  >
                    <option value="">Select product</option>
                    {products
                      .filter((p) => p.status !== "ARCHIVED")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    {...register(`items.${index}.quantity`)}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit cost"
                      {...register(`items.${index}.unitCost`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive"
                    onClick={() => remove(index)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {errors.items?.[index]?.productId && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.items[index].productId.message}
                </p>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ productId: "", quantity: 1, unitCost: 0 })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
        {errors.items?.message && (
          <p className="text-xs text-destructive">{errors.items.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" placeholder="Optional" {...register("notes")} />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Total:{" "}
          <span className="font-semibold">
            {visibleTotal.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </span>
        </p>
        <Button type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create Purchase Order"}
        </Button>
      </div>
    </form>
  );
}