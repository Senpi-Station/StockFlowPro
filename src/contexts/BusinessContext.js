"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuthContext } from "./AuthContext";
import { getBusiness, getDocument, listSubcollection } from "@/lib/firestore";

const BusinessContext = createContext({
  business: null,
  members: [],
  loading: true,
  refreshBusiness: () => {},
  refreshMembers: () => {},
});

export function BusinessProvider({ children }) {
  const { profile } = useAuthContext();
  const [business, setBusiness] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const businessId = profile?.businessId;

  const [prevBusinessId, setPrevBusinessId] = useState(businessId);
  if (prevBusinessId !== businessId) {
    setPrevBusinessId(businessId);
    setBusiness(null);
    setMembers([]);
    setLoading(!businessId);
  }

  const refreshBusiness = useCallback(async () => {
    if (!businessId) {
      setBusiness(null);
      return;
    }
    try {
      const data = await getBusiness(businessId);
      setBusiness(data);
    } catch (error) {
      console.error("Failed to load business:", error);
      setBusiness(null);
    }
  }, [businessId]);

  const refreshMembers = useCallback(async () => {
    if (!businessId) return;
    try {
      const data = await listSubcollection(businessId, "members");
      setMembers(data);
    } catch (error) {
      console.error("Failed to load members:", error);
      setMembers([]);
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      await Promise.all([refreshBusiness(), refreshMembers()]);
      setLoading(false);
    })();
  }, [businessId, refreshBusiness, refreshMembers]);

  return (
    <BusinessContext.Provider
      value={{ business, members, loading, refreshBusiness, refreshMembers }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  return useContext(BusinessContext);
}