"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listSubcollection, listWhere } from "@/lib/firestore";

export function useInventory() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMovements = useCallback(async (opts = {}) => {
    if (!businessId) return [];
    setLoading(true);
    try {
      const { max, type } = opts;
      const data = type
        ? await listWhere(businessId, "stockMovements", "type", "==", type, "createdAt", "desc", max)
        : await listSubcollection(businessId, "stockMovements", "createdAt", "desc", max);
      setMovements(data);
      return data;
    } catch (error) {
      console.error("Failed to load movements:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  return { movements, loading, loadMovements };
}