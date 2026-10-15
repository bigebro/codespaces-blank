// src/features/ingredients/useIngredients.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useIngredients(activeClient: string) {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  const fetchIngredients = useCallback(async () => {
    if (!activeClient) return;
    setLoadingIngredients(true);
    const { data } = await supabase
      .from("ingredients")
      .select("*")
      .ilike("client_id", activeClient)
      .order("name", { ascending: true });

    if (data) setIngredients(data);
    setLoadingIngredients(false);
  }, [activeClient]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  return { ingredients, setIngredients, fetchIngredients, loadingIngredients };
}