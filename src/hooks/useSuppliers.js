"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  listSubcollection,
  createInSubcollection,
  updateInSubcollection,
} from "@/lib/firestore";

export function useSuppliers() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSuppliers = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await listSubcollection(businessId, "suppliers", "companyName", "asc");
      setSuppliers(data);
      return data;
    } catch (error) {
      console.error("Failed to load suppliers:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const createSupplier = useCallback(async (data) => {
    if (!businessId) throw new Error("No business context");
    return createInSubcollection(businessId, "suppliers", data);
  }, [businessId]);

  const updateSupplier = useCallback(async (id, data) => {
    if (!businessId) throw new Error("No business context");
    await updateInSubcollection(businessId, "suppliers", id, data);
  }, [businessId]);

  return {
    suppliers,
    loading,
    loadSuppliers,
    createSupplier,
    updateSupplier,
  };
}