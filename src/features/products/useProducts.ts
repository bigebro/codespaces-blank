// src/features/products/useProducts.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useProducts(activeClient: string) {
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!activeClient) return;
    setLoadingProducts(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .ilike("client_id", activeClient);

    if (data) setProductsList(data);
    setLoadingProducts(false);
  }, [activeClient]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { productsList, setProductsList, fetchProducts, loadingProducts };
}