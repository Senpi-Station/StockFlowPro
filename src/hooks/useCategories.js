"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  listSubcollection,
  createInSubcollection,
  updateInSubcollection,
  deleteInSubcollection,
} from "@/lib/firestore";

export function useCategories(options = {}) {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await listSubcollection(businessId, "categories", "name", "asc");
      setCategories(data);
      return data;
    } catch (error) {
      console.error("Failed to load categories:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const createCategory = useCallback(async (data) => {
    if (!businessId) throw new Error("No business context");
    return createInSubcollection(businessId, "categories", data);
  }, [businessId]);

  const updateCategory = useCallback(async (id, data) => {
    if (!businessId) throw new Error("No business context");
    await updateInSubcollection(businessId, "categories", id, data);
  }, [businessId]);

  const archiveCategory = useCallback(async (id) => {
    if (!businessId) throw new Error("No business context");
    await updateInSubcollection(businessId, "categories", id, { archived: true });
  }, [businessId]);

  const deleteCategory = useCallback(async (id) => {
    if (!businessId) throw new Error("No business context");
    await deleteInSubcollection(businessId, "categories", id);
  }, [businessId]);

  return {
    categories,
    loading,
    loadCategories,
    createCategory,
    updateCategory,
    archiveCategory,
    deleteCategory,
  };
}