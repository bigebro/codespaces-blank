// src/features/ingredients/IngredientsPanel.tsx
"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useIngredients } from "./useIngredients";
import { Edit2, Trash2 } from "lucide-react";
export default function IngredientsPanel({
  activeClient,
  ingredients,
  setIngredients,
}: {
  activeClient: string;
  ingredients: any[];
  setIngredients: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const [newIngDraft, setNewIngDraft] = useState({
    name: "",
    unit: "гр",
    price: "",
    par: "0",
  });
  const [editingIngId, setEditingIngId] = useState<string | null>(null);
  const [editingIngDraft, setEditingIngDraft] = useState({
    name: "",
    unit: "гр",
    price: "",
    par: "0",
  });
  const [ingSearch, setIngSearch] = useState("");
  const [showAddIngModal, setShowAddIngModal] = useState(false);
  const [newIngForm, setNewIngForm] = useState({
    name: "",
    unit: "гр",
    price: "",
    par: "0",
  });
  // 1. Hook-оор датагаа татна
  const { fetchIngredients } = useIngredients(activeClient);
  const [editingIngredient, setEditingIngredient] = useState<any | null>(null);

  // Түүхий эд: Хүснэгт дотор шинэ мөр нэмэх & мөр засах
  const [isAddingIngRow, setIsAddingIngRow] = useState(false);
  const [selectedIngIds, setSelectedIngIds] = useState<string[]>([]);

  const handleSaveNewIng = async () => {
    if (!newIngDraft.name.trim()) return;
    const { data } = await supabase
      .from("ingredients")
      .insert([
        {
          client_id: activeClient,
          name: newIngDraft.name.trim(),
          unit: newIngDraft.unit || "гр",
          unit_price: parseFloat(newIngDraft.price) || 0,
          par_level: parseFloat(newIngDraft.par) || 0,
          current_stock: 0,
        },
      ])
      .select()
      .single();

    if (data) setIngredients((prev: any[]) => [data, ...prev]);
    setIsAddingIngRow(false);
    setNewIngDraft({ name: "", unit: "гр", price: "", par: "0" });
  };

  const handleSaveEditedIng = async (ing: any) => {
    const updatedObj = {
      ...ing,
      name: editingIngDraft.name.trim() || ing.name,
      unit: editingIngDraft.unit,
      unit_price: parseFloat(editingIngDraft.price) || 0,
      par_level: parseFloat(editingIngDraft.par) || 0,
    };
    setIngredients((prev: any[]) =>
      prev.map((i) => (i.id === ing.id ? updatedObj : i)),
    );
    setEditingIngId(null);
    await supabase
      .from("ingredients")
      .update({
        name: updatedObj.name,
        unit: updatedObj.unit,
        unit_price: updatedObj.unit_price,
        par_level: updatedObj.par_level,
      })
      .eq("id", ing.id);
    fetchIngredients();
  };

  return (
    <div className="pt-4 space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <input
          type="text"
          value={ingSearch}
          onChange={(e) => setIngSearch(e.target.value)}
          placeholder=" Түүхий эдийн нэрээр хайх..."
          className="w-full sm:flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-700"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {selectedIngIds.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (
                  !confirm(
                    `Сонгосон ${selectedIngIds.length} түүхий эдийг устгах уу?`,
                  )
                )
                  return;
                setIngredients((prev) =>
                  prev.filter((i) => !selectedIngIds.includes(i.id)),
                );
                const ids = [...selectedIngIds];
                setSelectedIngIds([]);
                await supabase.from("ingredients").delete().in("id", ids);
                fetchIngredients();
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2.5 rounded-xl text-sm font-black transition active:scale-95 flex items-center gap-1.5 shadow"
            >
              <span>🗑️ Сонгосон ({selectedIngIds.length}) устгах</span>
            </button>
          )}

          {/* ⚡ Шинэ мөр нээх товч (Поп-ап ЦОНХГҮЙ!) */}
          <button
            type="button"
            onClick={() => {
              setIsAddingIngRow(!isAddingIngRow);
              setNewIngDraft({
                name: "",
                unit: "гр",
                price: "",
                par: "0",
              });
            }}
            className={`${
              isAddingIngRow
                ? "bg-zinc-800 text-zinc-300"
                : "bg-white hover:bg-zinc-200 text-zinc-950"
            } px-4 py-2.5 rounded-xl text-sm font-black transition flex items-center gap-1.5 active:scale-95 shadow`}
          >
            <span>{isAddingIngRow ? "✕ Цуцлах" : "+ Түүхий эд нэмэх"}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[420px] border border-zinc-800 rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold sticky top-0 border-b border-zinc-800 z-10">
            <tr>
              <th className="py-3 px-3 w-8">
                <input
                  type="checkbox"
                  checked={
                    selectedIngIds.length > 0 &&
                    selectedIngIds.length === ingredients.length
                  }
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedIngIds(ingredients.map((i) => i.id));
                    else setSelectedIngIds([]);
                  }}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
                />
              </th>
              <th className="py-3 px-3">Барааны нэр</th>
              <th className="py-3 px-3">Хэмжих нэгж</th>
              <th className="py-3 px-3 text-right">Нэгжийн өртөг (₮)</th>
              <th className="py-3 px-3 text-right">Хэвийн нөөц (PAR)</th>
              <th className="py-3 px-3 text-right">Үйлдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-zinc-950/40 font-medium">
            {/* ⚡ 1. ХҮСНЭГТ ДОТОР НЭЭГДЭХ ШИНЭ МӨР (ЦОНХГҮЙ!) */}
            {isAddingIngRow && (
              <tr className="bg-emerald-950/40 border-b-2 border-zinc-700/60 animate-in fade-in duration-150">
                <td className="py-2 px-3 text-zinc-200 font-bold">New</td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    autoFocus
                    value={newIngDraft.name}
                    onChange={(e) =>
                      setNewIngDraft({
                        ...newIngDraft,
                        name: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNewIng();
                    }}
                    placeholder="Түүхий эдийн нэр..."
                    className="w-full bg-zinc-950 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-sm text-white font-bold outline-none focus:border-zinc-700"
                  />
                </td>
                <td className="py-2 px-3">
                  <select
                    value={newIngDraft.unit}
                    onChange={(e) =>
                      setNewIngDraft({
                        ...newIngDraft,
                        unit: e.target.value,
                      })
                    }
                    className="bg-zinc-950 border border-zinc-700/60 rounded-lg px-2 py-1 text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="гр">гр</option>
                    <option value="мл">мл</option>
                    <option value="ш">ш</option>
                    <option value="кг">кг</option>
                    <option value="л">л</option>
                    <option value="порц">порц</option>
                  </select>
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    value={newIngDraft.price}
                    onChange={(e) =>
                      setNewIngDraft({
                        ...newIngDraft,
                        price: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNewIng();
                    }}
                    placeholder="Өртөг ₮..."
                    className="w-24 bg-zinc-950 border border-zinc-700/60 rounded-lg px-2 py-1 text-right text-sm text-zinc-200 font-mono font-bold outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    value={newIngDraft.par}
                    onChange={(e) =>
                      setNewIngDraft({ ...newIngDraft, par: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNewIng();
                    }}
                    placeholder="PAR..."
                    className="w-20 bg-zinc-950 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-right text-sm text-white font-mono outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={!newIngDraft.name.trim()}
                      onClick={async () => {
                        const { data } = await supabase
                          .from("ingredients")
                          .insert([
                            {
                              client_id: activeClient,
                              name: newIngDraft.name.trim(),
                              unit: newIngDraft.unit || "гр",
                              unit_price: parseFloat(newIngDraft.price) || 0,
                              par_level: parseFloat(newIngDraft.par) || 0,
                              current_stock: 0,
                            },
                          ])
                          .select()
                          .single();
                        if (data) setIngredients((prev) => [data, ...prev]);
                        setIsAddingIngRow(false);
                        setNewIngDraft({
                          name: "",
                          unit: "гр",
                          price: "",
                          par: "0",
                        });
                      }}
                      className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-2.5 py-1 rounded-lg text-sm transition"
                      title="Хадгалах"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingIngRow(false)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-lg text-sm"
                      title="Болих"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* ТҮҮХИЙ ЭДИЙН ЖАГСААЛТ */}
            {ingredients
              .filter(
                (i) =>
                  !ingSearch.trim() ||
                  i.name.toLowerCase().includes(ingSearch.toLowerCase().trim()),
              )
              .map((ing) => {
                const isEditingThis = editingIngId === ing.id;

                // ⚡ 2. ХҮСНЭГТ ДОТОР МӨР ШУУД ЗАСАГДАХ ГОРИМ
                if (isEditingThis) {
                  return (
                    <tr
                      key={ing.id}
                      className="bg-zinc-900/60 border-b-2 border-zinc-700/60"
                    >
                      <td className="py-2 px-3"></td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          autoFocus
                          value={editingIngDraft.name}
                          onChange={(e) =>
                            setEditingIngDraft({
                              ...editingIngDraft,
                              name: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditedIng(ing);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-sm text-white font-bold outline-none"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={editingIngDraft.unit}
                          onChange={(e) =>
                            setEditingIngDraft({
                              ...editingIngDraft,
                              unit: e.target.value,
                            })
                          }
                          className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white outline-none cursor-pointer"
                        >
                          <option value="гр">гр</option>
                          <option value="мл">мл</option>
                          <option value="ш">ш</option>
                          <option value="кг">кг</option>
                          <option value="л">л</option>
                          <option value="порц">порц</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={editingIngDraft.price}
                          onChange={(e) =>
                            setEditingIngDraft({
                              ...editingIngDraft,
                              price: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditedIng(ing);
                          }}
                          className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-right text-sm text-zinc-200 font-mono font-bold outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={editingIngDraft.par}
                          onChange={(e) =>
                            setEditingIngDraft({
                              ...editingIngDraft,
                              par: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditedIng(ing);
                          }}
                          className="w-20 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-right text-sm text-white font-mono outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const updatedObj = {
                                ...ing,
                                name: editingIngDraft.name.trim() || ing.name,
                                unit: editingIngDraft.unit,
                                unit_price:
                                  parseFloat(editingIngDraft.price) || 0,
                                par_level: parseFloat(editingIngDraft.par) || 0,
                              };
                              // ⚡ 0ms Optimistic UI
                              setIngredients((prev) =>
                                prev.map((i) =>
                                  i.id === ing.id ? updatedObj : i,
                                ),
                              );
                              setEditingIngId(null);
                              await supabase
                                .from("ingredients")
                                .update({
                                  name: updatedObj.name,
                                  unit: updatedObj.unit,
                                  unit_price: updatedObj.unit_price,
                                  par_level: updatedObj.par_level,
                                })
                                .eq("id", ing.id);
                              fetchIngredients();
                            }}
                            className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-2.5 py-1 rounded-lg text-sm transition"
                            title="Батлах"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIngId(null)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-lg text-sm"
                            title="Цуцлах"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // ЭНГИЙН МӨР
                return (
                  <tr key={ing.id} className="hover:bg-zinc-900/60 transition">
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIngIds.includes(ing.id)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedIngIds((prev) => [...prev, ing.id]);
                          else
                            setSelectedIngIds((prev) =>
                              prev.filter((id) => id !== ing.id),
                            );
                        }}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {ing.name}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">{ing.unit}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-200 font-mono font-bold">
                      {parseFloat(ing.unit_price || 0).toLocaleString()} ₮
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-300 font-mono">
                      {ing.par_level || 0} {ing.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIngId(ing.id);
                            setEditingIngDraft({
                              name: ing.name,
                              unit: ing.unit || "гр",
                              price: (ing.unit_price || 0).toString(),
                              par: (ing.par_level || 0).toString(),
                            });
                          }}
                          className="h-7 w-7 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300 text-zinc-400 flex items-center justify-center transition active:scale-95 shrink-0"
                          title="Мөр дотор засах"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !confirm(`"${ing.name}" түүхий эдийг устгах уу?`)
                            )
                              return;
                            setIngredients((prev) =>
                              prev.filter((i) => i.id !== ing.id),
                            );
                            await supabase
                              .from("ingredients")
                              .delete()
                              .eq("id", ing.id);
                            fetchIngredients();
                          }}
                          className="h-7 w-7 rounded-xl bg-zinc-950/70 hover:bg-rose-500/20 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-rose-300 flex items-center justify-center text-sm transition active:scale-95 shrink-0 cursor-pointer shadow-sm"
                          title="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* ➕ 1. ШИНЭ ТҮҮХИЙ ЭД НЭМЭХ МОДАЛ                                           */}
      {/* ========================================================================= */}
      {showAddIngModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-700 p-5 rounded-3xl max-w-sm w-full space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-black text-white">
                + Шинэ Түүхий эд нэмэх
              </h3>
              <button
                onClick={() => setShowAddIngModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              required
              value={newIngForm.name}
              onChange={(e) =>
                setNewIngForm({ ...newIngForm, name: e.target.value })
              }
              placeholder="Түүхий эдийн нэр (Жишээ: Овьёосны сүү)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newIngForm.unit}
                onChange={(e) =>
                  setNewIngForm({ ...newIngForm, unit: e.target.value })
                }
                placeholder="Нэгж (мл/гр/ш)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white outline-none"
              />
              <input
                type="number"
                value={newIngForm.price}
                onChange={(e) =>
                  setNewIngForm({ ...newIngForm, price: e.target.value })
                }
                placeholder="Нэгжийн өртөг ₮"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white outline-none"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!newIngForm.name.trim()) return;
                const { data } = await supabase
                  .from("ingredients")
                  .insert([
                    {
                      client_id: activeClient,
                      name: newIngForm.name.trim(),
                      unit: newIngForm.unit || "гр",
                      unit_price: parseFloat(newIngForm.price) || 0,
                      par_level: parseFloat(newIngForm.par) || 0,
                      current_stock: 0,
                    },
                  ])
                  .select()
                  .single();
                if (data) setIngredients((prev) => [...prev, data]);
                setShowAddIngModal(false);
                setNewIngForm({
                  name: "",
                  unit: "гр",
                  price: "",
                  par: "0",
                });
              }}
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-2.5 rounded-xl text-sm transition"
            >
              Хадгалах
            </button>
          </div>
        </div>
      )}

      {/* ✏️ ТҮҮХИЙ ЭД БҮРЭН ЗАСАХ МОДАЛ */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-700 p-5 rounded-3xl max-w-sm w-full space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-black text-white">
                  <Edit2 className="h-4 w-4" />
                Түүхий эд засах
              </h3>
              <button
                onClick={() => setEditingIngredient(null)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                Барааны нэр:
              </label>
              <input
                type="text"
                value={editingIngredient.name}
                onChange={(e) =>
                  setEditingIngredient({
                    ...editingIngredient,
                    name: e.target.value,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-sm text-white outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  Нэгж (мл, гр, ш):
                </label>
                <input
                  type="text"
                  value={editingIngredient.unit}
                  onChange={(e) =>
                    setEditingIngredient({
                      ...editingIngredient,
                      unit: e.target.value,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  Нэгжийн өртөг (₮):
                </label>
                <input
                  type="number"
                  value={editingIngredient.unit_price}
                  onChange={(e) =>
                    setEditingIngredient({
                      ...editingIngredient,
                      unit_price: e.target.value,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-sm text-zinc-200 font-mono font-bold outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                Хэвийн нөөц (PAR):
              </label>
              <input
                type="number"
                value={editingIngredient.par_level}
                onChange={(e) =>
                  setEditingIngredient({
                    ...editingIngredient,
                    par_level: e.target.value,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-sm text-white outline-none"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase
                  .from("ingredients")
                  .update({
                    name: editingIngredient.name,
                    unit: editingIngredient.unit,
                    unit_price: parseFloat(editingIngredient.unit_price) || 0,
                    par_level: parseFloat(editingIngredient.par_level) || 0,
                  })
                  .eq("id", editingIngredient.id);

                if (error) alert(error.message);
                else {
                  setIngredients((prev) =>
                    prev.map((i) =>
                      i.id === editingIngredient.id ? editingIngredient : i,
                    ),
                  );
                  setEditingIngredient(null);
                  fetchIngredients();
                }
              }}
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-2.5 rounded-xl text-sm transition"
            >
              Хадгалах
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
