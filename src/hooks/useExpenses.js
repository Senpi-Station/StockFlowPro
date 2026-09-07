"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  listSubcollection,
  listWhere,
  createInSubcollection,
  updateInSubcollection,
  deleteInSubcollection,
} from "@/lib/firestore";

export function useExpenses() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadExpenses = useCallback(async (opts = {}) => {
    if (!businessId) return [];
    setLoading(true);
    setLoadError(null);
    try {
      const { max, category } = opts;
      const data = category
        ? await listWhere(businessId, "expenses", "category", "==", category, "date", "desc", max)
        : await listSubcollection(businessId, "expenses", "date", "desc", max);
      setExpenses(data);
      return data;
    } catch (error) {
      console.error("Failed to load expenses:", error);
      setLoadError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const createExpense = useCallback(async (data) => {
    if (!businessId) throw new Error("No business context");
    return createInSubcollection(businessId, "expenses", {
      ...data,
      amount: Number(data.amount || 0),
    });
  }, [businessId]);

  const updateExpense = useCallback(async (id, data) => {
    if (!businessId) throw new Error("No business context");
    await updateInSubcollection(businessId, "expenses", id, {
      ...data,
      amount: Number(data.amount || 0),
    });
  }, [businessId]);

  const deleteExpense = useCallback(async (id) => {
    if (!businessId) throw new Error("No business context");
    await deleteInSubcollection(businessId, "expenses", id);
  }, [businessId]);

  return {
    expenses,
    loading,
    loadError,
    loadExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}