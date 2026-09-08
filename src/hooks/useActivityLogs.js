"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getActivityLogs } from "@/lib/activity";

export function useActivityLogs() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadLogs = useCallback(async (max = 300) => {
    if (!businessId) return [];
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getActivityLogs(businessId, max);
      setLogs(data);
      return data;
    } catch (error) {
      console.error("Failed to load activity logs:", error);
      setLoadError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  return { logs, loading, loadError, loadLogs };
}