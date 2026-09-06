"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { subscribeToAuth } from "@/lib/firebase-auth";
import { getUserProfile } from "@/lib/firestore";

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null);
      return;
    }
    try {
      const profile = await getUserProfile(uid);
      setProfile(profile);
    } catch (error) {
      console.error("Failed to load user profile:", error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        getUserProfile(firebaseUser.uid)
          .then((profile) => setProfile(profile))
          .catch((error) => {
            console.error("Failed to load user profile:", error);
            setProfile(null);
          });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}