"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listSubcollection, createInSubcollection } from "@/lib/firestore";

export function useLocations() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLocations = useCallback(async () => {
    if (!businessId) return [];
    setLoading(true);
    try {
      const data = await listSubcollection(businessId, "locations", "createdAt", "asc");
      setLocations(data);
      return data;
    } catch (error) {
      console.error("Failed to load locations:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const createLocation = useCallback(async (data) => {
    if (!businessId) throw new Error("No business context");
    return createInSubcollection(businessId, "locations", data);
  }, [businessId]);

  return { locations, loading, loadLocations, createLocation };
}