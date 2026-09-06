"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  brand: z.string().optional(),
  purchasePrice: z.coerce
    .number()
    .min(0, "Purchase price cannot be negative")
    .optional()
    .default(0),
  sellingPrice: z.coerce
    .number()
    .min(0, "Selling price cannot be negative")
    .optional()
    .default(0),
  currentStock: z.coerce.number().min(0, "Stock cannot be negative").optional().default(0),
  minimumStock: z.coerce.number().min(0, "Minimum stock cannot be negative").optional().default(0),
  maximumStock: z.coerce.number().min(0, "Maximum stock cannot be negative").optional().default(0),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export function ProductForm({
  initialValues,
  onSubmit,
  submitLabel = "Save Product",
  categories = [],
  suppliers = [],
  busy = false,
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      categoryId: "",
      supplierId: "",
      brand: "",
      purchasePrice: 0,
      sellingPrice: 0,
      currentStock: 0,
      minimumStock: 0,
      maximumStock: 0,
      description: "",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (initialValues) {
      Object.entries(initialValues).forEach(([key, value]) => {
        if (value !== undefined && value !== null) setValue(key, value);
      });
    }
  }, [initialValues, setValue]);

  const onFormSubmit = async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      toast.error(error.message || "Failed to save product");
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Product Name</Label>
        <Input id="name" placeholder="e.g. Wireless Mouse" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" placeholder="e.g. WM-001" {...register("sku")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" placeholder="Barcode" {...register("barcode")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" placeholder="e.g. Logitech" {...register("brand")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Category</Label>
          <select
            id="categoryId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            {...register("categoryId")}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="supplierId">Supplier</Label>
          <select
            id="supplierId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            {...register("supplierId")}
          >
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            {...register("status")}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="purchasePrice">Purchase Price</Label>
          <Input id="purchasePrice" type="number" step="0.01" {...register("purchasePrice")} />
          {errors.purchasePrice && (
            <p className="text-xs text-destructive">{errors.purchasePrice.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sellingPrice">Selling Price</Label>
          <Input id="sellingPrice" type="number" step="0.01" {...register("sellingPrice")} />
          {errors.sellingPrice && (
            <p className="text-xs text-destructive">{errors.sellingPrice.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="currentStock">Current Stock</Label>
          <Input id="currentStock" type="number" {...register("currentStock")} />
          {errors.currentStock && (
            <p className="text-xs text-destructive">{errors.currentStock.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minimumStock">Min Stock</Label>
          <Input id="minimumStock" type="number" {...register("minimumStock")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maximumStock">Max Stock</Label>
          <Input id="maximumStock" type="number" {...register("maximumStock")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          placeholder="Optional description"
          {...register("description")}
        />
      </div>

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}