"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

function cleanString(str: string) {
  return String(str || "").replace(/[\u00a0\s]+/g, " ").trim();
}

export function useRecipes(activeClient: string, ingredients: any[]) {
  const [recipes, setRecipes] = useState<any[]>([]);

  const fetchRecipes = useCallback(async () => {
    if (!activeClient) return;
    const { data } = await supabase.from("recipes").select("*").ilike("client_id", activeClient);
    if (data) setRecipes(data);
  }, [activeClient]);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);


              // 🕒 1. БҮТЭЭГДЭХҮҮНИЙ ЖОР ӨӨРЧЛӨГДӨХ БҮРД ТҮҮХ ХАДГАЛАХ (ТӨГС УХААЛАГ ХУВИЛБАР)
                const recordRecipeSnapshot = async (
                  productName: string, 
                  arg2?: 'created' | 'updated' | 'deleted' | any[],
                  arg3?: 'created' | 'updated' | 'deleted' | any[]
                ) => {
                  // Параметрүүд аль ч дарааллаар орж ирсэн автоматаар зөв ялгах логик:
                  let action: 'created' | 'updated' | 'deleted' = 'updated';
                  let customItems: any[] | undefined = undefined;
              
                  if (typeof arg2 === 'string') {
                    action = arg2 as 'created' | 'updated' | 'deleted';
                    if (Array.isArray(arg3)) customItems = arg3;
                  } else if (Array.isArray(arg2)) {
                    customItems = arg2;
                    if (typeof arg3 === 'string') action = arg3 as 'created' | 'updated' | 'deleted';
                  }
              
                 const { data: { session: currentSession } } = await supabase.auth.getSession();
                const currentActor = currentSession?.user?.user_metadata?.full_name || currentSession?.user?.email?.split('@')[0] || "Админ";
                  
                  // Хэрэв бэлэн орц өгөөгүй бол одоо баазад байгаа тухайн бүтээгдэхүүний орцуудыг татна
                  let itemsToSave = customItems;
                  if (!itemsToSave || itemsToSave.length === 0) {
                    const prodRecipes = recipes.filter(
                      (r: any) => cleanString(r.product_name).toLowerCase() === cleanString(productName).toLowerCase()
                    );
                    itemsToSave = prodRecipes.map((r: any) => {
                      const ing = ingredients.find((i: any) => i.id === r.ingredient_id);
                      return {
                        ingredient_id: r.ingredient_id,
                        name: ing?.name || "Орц",
                        unit: ing?.unit || "гр",
                        amount: parseFloat(r.amount) || 0
                      };
                    });
                  } else {
                    // Орцын нэр дутуу байвал нөхөх
                    itemsToSave = itemsToSave.map((it: any) => {
                      const ing = ingredients.find((i: any) => i.id === it.ingredient_id);
                      return {
                        ingredient_id: it.ingredient_id,
                        name: it.name || ing?.name || "Орц",
                        unit: it.unit || ing?.unit || "гр",
                        amount: parseFloat(it.amount) || 0
                      };
                    });
                  }
              
                  await supabase.from("recipe_snapshots").insert([{
                    client_id: activeClient,
                    product_name: productName,
                    action: action,
                    ingredients_snapshot: itemsToSave,
                    author: `${currentActor} (Dashboard)`
                  }]);
                };

  return { recipes, setRecipes, fetchRecipes, recordRecipeSnapshot };
}