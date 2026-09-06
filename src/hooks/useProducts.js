"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  listSubcollection,
  createInSubcollection,
  updateInSubcollection,
} from "@/lib/firestore";

export function useProducts() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadProducts = useCallback(async (opts = {}) => {
    if (!businessId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { max } = opts;
      const data = await listSubcollection(businessId, "products", "createdAt", "desc", max);
      setProducts(data);
      return data;
    } catch (error) {
      console.error("Failed to load products:", error);
      setLoadError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const createProduct = useCallback(async (data) => {
    if (!businessId) throw new Error("No business context");
    const id = await createInSubcollection(businessId, "products", {
      ...data,
      currentStock: Number(data.currentStock || 0),
      minimumStock: Number(data.minimumStock || 0),
      maximumStock: Number(data.maximumStock || 0),
      status: data.status || "ACTIVE",
    });
    return id;
  }, [businessId]);

  const updateProduct = useCallback(async (id, data) => {
    if (!businessId) throw new Error("No business context");
    await updateInSubcollection(businessId, "products", id, data);
  }, [businessId]);

  const archiveProduct = useCallback(async (id) => {
    if (!businessId) throw new Error("No business context");
    await updateInSubcollection(businessId, "products", id, { status: "ARCHIVED" });
  }, [businessId]);

  const restoreProduct = useCallback(async (id) => {
    if (!businessId) throw new Error("No business context");
    await updateInSubcollection(businessId, "products", id, { status: "ACTIVE" });
  }, [businessId]);

  return {
    products,
    loading,
    loadError,
    loadProducts,
    createProduct,
    updateProduct,
    archiveProduct,
    restoreProduct,
  };
}