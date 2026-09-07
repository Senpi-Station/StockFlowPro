"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listSubcollection } from "@/lib/firestore";

export function useTransfers() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTransfers = useCallback(async (opts = {}) => {
    if (!businessId) return [];
    setLoading(true);
    try {
      const { max } = opts;
      const data = await listSubcollection(businessId, "transfers", "createdAt", "desc", max);
      setTransfers(data);
      return data;
    } catch (error) {
      console.error("Failed to load transfers:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  return { transfers, loading, loadTransfers };
}