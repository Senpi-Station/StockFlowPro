"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { ProductTable } from "@/components/products/product-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { canAccess } from "@/lib/permissions";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { business } = useBusiness();
  const { products, loading, loadProducts, archiveProduct, restoreProduct } = useProducts();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [confirmArch, setConfirmArch] = useState(null);
  const [busy, setBusy] = useState(false);

  const canManage = canAccess(profile?.role, "products");

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.sku || "").toLowerCase().includes(q) ||
          (p.barcode || "").toLowerCase().includes(q)
      );
    }
    if (filter !== "ALL") {
      list = list.filter((p) => p.status === filter);
    }
    return list;
  }, [products, search, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleArchive = useCallback(
    async (p) => {
      setConfirmArch(p);
    },
    []
  );

  const confirmArchive = async () => {
    if (!confirmArch) return;
    setBusy(true);
    try {
      await archiveProduct(confirmArch.id);
      toast.success("Product archived");
      setConfirmArch(null);
      loadProducts();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreProduct(id);
      toast.success("Product restored");
      loadProducts();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        actions={
          canManage && (
            <Button onClick={() => router.push("/dashboard/products/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by name, SKU, or barcode..."
          className="w-full sm:max-w-sm"
        />
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm sm:w-auto"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <ProductTable
        products={pageItems}
        onEdit={(p) => router.push(`/dashboard/products/${p.id}`)}
        onArchive={handleArchive}
        onRestore={handleRestore}
        currency={business?.currency}
        loading={loading}
      />

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <ConfirmDialog
        open={!!confirmArch}
        title="Archive Product?"
        description="This product will be hidden from active lists but can be restored later."
        confirmLabel="Archive"
        onConfirm={confirmArchive}
        onCancel={() => setConfirmArch(null)}
        busy={busy}
      />
    </div>
  );
}