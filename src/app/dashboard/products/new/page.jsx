"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useSuppliers } from "@/hooks/useSuppliers";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/products/product-form";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";

export default function NewProductPage() {
  const router = useRouter();
  const { createProduct } = useProducts();
  const { categories, loadCategories } = useCategories();
  const { suppliers, loadSuppliers } = useSuppliers();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadCategories(), loadSuppliers()]).then(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (data) => {
    setBusy(true);
    try {
      const id = await createProduct({
        ...data,
        categoryId: data.categoryId || null,
        supplierId: data.supplierId || null,
      });
      toast.success("Product created");
      router.push(`/dashboard/products/${id}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return <LoadingSkeleton className="h-96 w-full" />;
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New Product"
        description="Add a product to your inventory"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        }
      />
      <ProductForm
        onSubmit={handleSubmit}
        submitLabel="Create Product"
        categories={categories}
        suppliers={suppliers}
        busy={busy}
      />
    </div>
  );
}