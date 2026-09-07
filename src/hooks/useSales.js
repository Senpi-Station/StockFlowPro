"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listSubcollection, listWhere } from "@/lib/firestore";

export function useSales() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadSales = useCallback(async (opts = {}) => {
    if (!businessId) return [];
    setLoading(true);
    setLoadError(null);
    try {
      const { max, status, paymentMethod } = opts;
      let data;
      if (status) {
        data = await listWhere(businessId, "sales", "status", "==", status, "createdAt", "desc", max);
      } else if (paymentMethod) {
        data = await listWhere(businessId, "sales", "paymentMethod", "==", paymentMethod, "createdAt", "desc", max);
      } else {
        data = await listSubcollection(businessId, "sales", "createdAt", "desc", max);
      }
      setSales(data);
      return data;
    } catch (error) {
      console.error("Failed to load sales:", error);
      setLoadError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  return { sales, loading, loadError, loadSales };
}