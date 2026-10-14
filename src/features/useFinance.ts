// src/features/finance/useFinance.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
export function useFinance(clientId: string, startDate: string, endDate: string, enabled: boolean = true) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinance = useCallback(async () => {
    if (!clientId || !enabled) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(
        `/api/analytics?startDate=${encodeURIComponent(startDate)}T00:00:00.000Z&endDate=${encodeURIComponent(endDate)}T23:59:59.999Z`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [clientId, startDate, endDate, enabled]);

  useEffect(() => {
    fetchFinance();
  }, [fetchFinance]);

  return { data, loading, error, refetch: fetchFinance };
}