"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useSuppliers } from "@/hooks/useSuppliers";
import { getFromSubcollection, updateInSubcollection } from "@/lib/firestore";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/products/product-form";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getStockStatus, getStockStatusLabel } from "@/lib/calculations";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const { categories, loadCategories } = useCategories();
  const { suppliers, loadSuppliers } = useSuppliers();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!businessId || !id) return;
    (async () => {
      setLoading(true);
      try {
        const [prod, cats, sups] = await Promise.all([
          getFromSubcollection(businessId, "products", id),
          loadCategories(),
          loadSuppliers(),
        ]);
        setProduct(prod);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, id]);

  const categoryName = categories.find((c) => c.id === product?.categoryId)?.name;
  const supplierName = suppliers.find((s) => s.id === product?.supplierId)?.companyName;
  const stock = getStockStatusLabel(getStockStatus(product?.currentStock, product?.minimumStock));

  const handleUpdate = async (data) => {
    setBusy(true);
    try {
      await updateInSubcollection(businessId, "products", id, {
        ...data,
        categoryId: data.categoryId || null,
        supplierId: data.supplierId || null,
      });
      toast.success("Product updated");
      const updated = await getFromSubcollection(businessId, "products", id);
      setProduct(updated);
      setEditing(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton className="h-96 w-full" />;
  }

  if (!product) {
    return <p className="py-12 text-center text-muted-foreground">Product not found.</p>;
  }

  if (editing) {
    return (
      <div className="max-w-2xl">
        <PageHeader
          title="Edit Product"
          actions={
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          }
        />
        <ProductForm
          initialValues={product}
          onSubmit={handleUpdate}
          submitLabel="Update Product"
          categories={categories}
          suppliers={suppliers}
          busy={busy}
        />
      </div>
    );
  }

  const fields = [
    ["SKU", product.sku || "-"],
    ["Barcode", product.barcode || "-"],
    ["Brand", product.brand || "-"],
    ["Category", categoryName || "—"],
    ["Supplier", supplierName || "—"],
    ["Status", product.status || "ACTIVE"],
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={product.name}
        description={product.description || "No description"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <Button onClick={() => setEditing(true)}>Edit</Button>
          </div>
        }
      />

      <div className="mb-4">
        <Badge variant={stock.includes("Low") ? "warning" : stock.includes("Out") ? "destructive" : "success"}>
          {stock}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>Stock: {product.currentStock ?? 0} units</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            {fields.map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
            <div>
              <dt className="text-sm text-muted-foreground">Purchase Price</dt>
              <dd className="font-medium">{formatCurrency(product.purchasePrice)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Selling Price</dt>
              <dd className="font-medium">{formatCurrency(product.sellingPrice)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}