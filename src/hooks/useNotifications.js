"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getNotificationPreferences,
  saveNotificationPreferences,
  DEFAULT_PREFS,
} from "@/lib/notifications";

export function useNotifications() {
  const { profile } = useAuth();
  const businessId = profile?.businessId;
  const userId = profile?.id;
  const [notifications, setNotifications] = useState([]);
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadNotifications = useCallback(async (max = 100) => {
    if (!businessId) return [];
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listNotifications(businessId, max);
      setNotifications(data);
      return data;
    } catch (error) {
      console.error("Failed to load notifications:", error);
      setLoadError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const loadPrefs = useCallback(async () => {
    if (!businessId || !userId) return;
    const data = await getNotificationPreferences(businessId, userId);
    setPrefs(data);
    return data;
  }, [businessId, userId]);

  const markRead = useCallback(async (id) => {
    if (!businessId || !userId) return;
    await markNotificationRead(businessId, id, userId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readBy: { ...n.readBy, [userId]: true } } : n))
    );
  }, [businessId, userId]);

  const markAllRead = useCallback(async () => {
    if (!businessId || !userId) return;
    await markAllNotificationsRead(businessId, notifications, userId);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readBy: { ...n.readBy, [userId]: true } }))
    );
  }, [businessId, userId, notifications]);

  const remove = useCallback(async (id) => {
    if (!businessId) return;
    await deleteNotification(businessId, id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, [businessId]);

  const savePrefs = useCallback(async (next) => {
    if (!businessId || !userId) return;
    setPrefs(next);
    await saveNotificationPreferences(businessId, userId, next);
  }, [businessId, userId]);

  return {
    notifications,
    prefs,
    loading,
    loadError,
    loadNotifications,
    loadPrefs,
    markRead,
    markAllRead,
    remove,
    savePrefs,
  };
}