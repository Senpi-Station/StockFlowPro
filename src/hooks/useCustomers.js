"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  listSubcollection,
  createInSubcollection,
  updateInSubcollection,
  deleteInSubcollection,
} from "@/lib/firestore";

export function useCustomers() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadCustomers = useCallback(async (opts = {}) => {
    if (!businessId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { max } = opts;
      const data = await listSubcollection(businessId, "customers", "createdAt", "desc", max);
      setCustomers(data);
      return data;
    } catch (error) {
      console.error("Failed to load customers:", error);
      setLoadError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const createCustomer = useCallback(async (data) => {
    if (!businessId) throw new Error("No business context");
    const id = await createInSubcollection(businessId, "customers", {
      ...data,
      totalOrders: 0,
      totalSpent: 0,
    });
    return id;
  }, [businessId]);

  const updateCustomer = useCallback(async (id, data) => {
    if (!businessId) throw new Error("No business context");
    await updateInSubcollection(businessId, "customers", id, data);
  }, [businessId]);

  const deleteCustomer = useCallback(async (id) => {
    if (!businessId) throw new Error("No business context");
    await deleteInSubcollection(businessId, "customers", id);
  }, [businessId]);

  return {
    customers,
    loading,
    loadError,
    loadCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}