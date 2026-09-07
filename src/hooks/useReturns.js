"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listSubcollection } from "@/lib/firestore";

export function useReturns() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReturns = useCallback(async (opts = {}) => {
    if (!businessId) return [];
    setLoading(true);
    try {
      const { max } = opts;
      const data = await listSubcollection(businessId, "returns", "createdAt", "desc", max);
      setReturns(data);
      return data;
    } catch (error) {
      console.error("Failed to load returns:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  return { returns, loading, loadReturns };
}