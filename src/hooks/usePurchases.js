"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listSubcollection, listWhere } from "@/lib/firestore";

export function usePurchases() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadPurchases = useCallback(async (opts = {}) => {
    if (!businessId) return [];
    setLoading(true);
    setLoadError(null);
    try {
      const { max, status } = opts;
      const data = status
        ? await listWhere(businessId, "purchases", "status", "==", status, "createdAt", "desc", max)
        : await listSubcollection(businessId, "purchases", "createdAt", "desc", max);
      setPurchases(data);
      return data;
    } catch (error) {
      console.error("Failed to load purchases:", error);
      setLoadError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  return { purchases, loading, loadError, loadPurchases };
}