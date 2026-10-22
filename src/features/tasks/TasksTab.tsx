// src/features/tasks/TasksTab.tsx
"use client";
import React from "react";
import { CheckSquare, Activity, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TasksTabProps {
  activeClient: string;
  workersList: any[];
  companyRoles: any[];
  tasks: any[];
  shifts: any[];
  loading: boolean;
  setLoading: (l: boolean) => void;
  fetchDatabaseData: (client?: string) => Promise<void>;
  setSelectedImageModal: (
    modal: { url: string; title: string; subtitle?: string } | null,
  ) => void;
}

export default function TasksTab({
  activeClient,
  workersList,
  companyRoles,
  tasks,
  shifts,
  loading,
  setLoading,
  fetchDatabaseData,
  setSelectedImageModal,
}: TasksTabProps) {
  return (
    <>
      <div className="space-y-8">
        {" "}
        {/* ➕ ЭЗЭН ШИНЭ АЖИЛТАН ШУУД НЭМЭХ ХЭСЭГ (Нэр зөрөхөөс сэргийлнэ) */}
        {/* 🚀 АЖИЛТАН БҮРТГЭХ & УРИХ ШИНЭ КАРТ */}
        <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 mb-8 space-y-6">
          {/* 1. УРИЛГЫН ЛИНК ХУУЛАХ (Хамгийн амархан арга) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                🔗 Ажилтан урих холбоос
              </h4>
              <p className="text-sm text-slate-400 mt-1">
                Энэ линкийг ажилтандаа явуулснаар тэд салбарын нэрийг
                алдаагүйгээр шууд нэгдэж бүртгүүлнэ.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const inviteUrl = `${window.location.origin}/login?branch=${encodeURIComponent(activeClient)}&role=staff`;
                navigator.clipboard.writeText(inviteUrl);
                alert(`✅ Урилгын холбоос хуулагдлаа:\n${inviteUrl}`);
              }}
              className="bg-zinc-200/20 hover:bg-zinc-200/30 text-zinc-300 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0"
            >
              📋 Урилгын линк хуулах
            </button>
          </div>

          {/* ➕ ЭЗЭН ШИНЭ АЖИЛТАН ШУУД НЭМЭХ ХЭСЭГ (ДИНАМИК ҮҮРГҮҮДТЭЙ) */}
          <div className="mb-6">
            <h3 className="text-base font-bold mb-3 text-zinc-200">
              ➕ Салбартаа шинэ ажилтан нэмэх (Kiosk дээр шууд гарна)
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                const workerName = form.workerName.value.trim();
                const workerPin = form.workerPin.value.trim();
                const workerRole = form.workerRole.value;

                if (!workerName || workerPin.length !== 4) {
                  alert(
                    "Ажилтны нэр болон 4 оронтой PIN кодыг заавал оруулна уу!",
                  );
                  return;
                }
                if (!workerRole) {
                  alert("Ажилтны үүргийг сонгоно уу!");
                  return;
                }

                setLoading(true);
                // ДИНАМИК ҮҮРЭГТЭЙ АЖИЛТНЫГ ШУУД БААЗАД ХАДГАЛАХ
                const { error } = await supabase.from("profiles").insert([
                  {
                    id: crypto.randomUUID(),
                    client_id: activeClient,
                    full_name: workerName,
                    role: workerRole, // 👈 Эзний үүсгэсэн бодит үүрэг орно!
                    pin_code: workerPin,
                    email: `${workerName.toLowerCase().replace(/\s+/g, "")}@${activeClient.toLowerCase().replace(/\s+/g, "")}.internal`,
                  },
                ]);

                if (error) {
                  alert(`Алдаа: ${error.message}`);
                } else {
                  alert(
                    `✅ [${workerName}] ажилтныг [${workerRole}] үүрэгтэйгээр амжилттай бүртгэлээ! Kiosk дээр шууд гарна.`,
                  );
                  form.reset();
                  fetchDatabaseData(activeClient);
                }
                setLoading(false);
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3"
            >
              <input
                name="workerName"
                required
                placeholder="Ажилтны нэр (жнь: Болд)"
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-zinc-700"
              />
              <input
                name="workerPin"
                required
                maxLength={4}
                placeholder="4 оронтой PIN (жнь: 1234)"
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-zinc-700 text-center"
              />

              {/* 💡 ДИНАМИК ҮҮРГҮҮДИЙН СОНГОЛТ (Эзний үүсгэсэн бүх үүрэг энд гарч ирнэ): */}
              <select
                name="workerRole"
                required
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 font-bold outline-none cursor-pointer"
              >
                <option value="">-- Үүрэг сонгох --</option>
                <option value="Ажилтан">Ерөнхий ажилтан</option>
                {/* 🚀 ТАНЫ COMPANY_ROLES ДАХЬ БҮХ ҮҮРЭГ АВТОМАТААР ГАРНА: */}
                {companyRoles.map((r) => (
                  <option key={r.id} value={r.role_name}>
                    {r.role_name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={loading}
                className="bg-white hover:bg-zinc-200 text-zinc-950 font-black py-2.5 rounded-xl text-sm transition"
              >
                + Ажилтан Бүртгэх
              </button>
            </form>
          </div>
        </div>
        {/* SECTION 1: CREATE ROLES & ASSIGN ROLES TO WORKERS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Role Creator */}
          <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800">
            <h3 className="text-base font-bold mb-4 text-zinc-200">
              1. Албан тушаал / Үүрэг үүсгэх
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const roleInput = (
                  form.elements.namedItem("roleName") as HTMLInputElement
                ).value.trim();
                if (!roleInput) return;

                setLoading(true);
                const { error } = await supabase
                  .from("company_roles")
                  .insert([{ client_id: activeClient, role_name: roleInput }]);
                if (error) alert(`Алдаа: ${error.message}`);
                form.reset();
                await fetchDatabaseData(activeClient);
              }}
              className="space-y-3"
            >
              <input
                name="roleName"
                type="text"
                required
                placeholder="Жнь: Бармен, Талхчин, Зөөгч"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold outline-none focus:border-zinc-700"
              />
              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs"
              >
                + Үүрэг Нэмэх
              </button>
            </form>
            {/* Бүртгэлтэй үүргүүдийн жагсаалт ба Устгах товч */}
            <div className="flex flex-wrap gap-2 mt-3">
              {companyRoles.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-sm font-bold text-slate-200"
                >
                  <span>🏷️ {r.role_name}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`"${r.role_name}" үүргийг устгах уу?`))
                        return;
                      await supabase
                        .from("company_roles")
                        .delete()
                        .eq("id", r.id);
                      fetchDatabaseData(activeClient);
                    }}
                    className="text-rose-400 hover:text-rose-300 ml-1 font-black text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Assign Roles to Registered Workers */}
          <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 md:col-span-2">
            <h3 className="text-base font-bold mb-4 text-zinc-300">
              {" "}
              Ажилтнуудад үүрэг оноох
            </h3>
            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-800">
                    <th className="pb-2">Ажилтны Нэр</th>
                    <th className="pb-2">Үүрэг</th>
                    <th className="pb-2">Цалингийн Төрөл</th>
                    <th className="pb-2">Үнэлгээ (₮)</th>
                    <th className="pb-2 text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {workersList.map((w) => (
                    <tr key={w.id}>
                      <td className="py-2.5 font-bold text-slate-200">
                        {w.full_name || w.email.split("@")[0]}
                      </td>
                      <td className="py-2.5">
                        <select
                          value={w.role || "Ажилтан"}
                          onChange={async (e) => {
                            const updatedRole = e.target.value;
                            await supabase
                              .from("profiles")
                              .update({ role: updatedRole })
                              .eq("id", w.id);
                            fetchDatabaseData(activeClient);
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-sm text-zinc-200 font-bold"
                        >
                          <option value="Ажилтан">Ажилтан</option>
                          {companyRoles.map((r) => (
                            <option key={r.id} value={r.role_name}>
                              {r.role_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5">
                        <select
                          value={w.salary_type || "hourly"}
                          onChange={async (e) => {
                            const newType = e.target.value;
                            const defaultRate =
                              newType === "fixed" ? 1200000 : 6500;
                            await supabase
                              .from("profiles")
                              .update({
                                salary_type: newType,
                                base_rate: defaultRate,
                              })
                              .eq("id", w.id);
                            fetchDatabaseData(activeClient);
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-sm text-zinc-300 font-bold"
                        >
                          <option value="hourly">⏱️ Цагийн хөлс</option>
                          <option value="fixed">📅 Сар бүр тогтмол</option>
                        </select>
                      </td>
                      <td className="py-2.5">
                        <input
                          type="number"
                          defaultValue={w.base_rate || 6500}
                          onBlur={async (e) => {
                            const val = parseFloat(e.target.value) || 0;
                            await supabase
                              .from("profiles")
                              .update({ base_rate: val })
                              .eq("id", w.id);
                            fetchDatabaseData(activeClient);
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-sm text-white font-bold w-24 text-right"
                        />
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !confirm(`"${w.full_name}" ажилтныг устгах уу?`)
                            )
                              return;
                            const { error } = await supabase
                              .from("profiles")
                              .delete()
                              .eq("id", w.id);
                            if (error) alert(error.message);
                            else fetchDatabaseData(activeClient);
                          }}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-lg text-sm font-bold transition"
                        >
                          Устгах
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* SECTION 2: CREATE & VIEW TASKS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Task Form */}
          <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 md:col-span-1 h-fit">
            <h3 className="text-base font-bold mb-4 text-zinc-200">
              3. Шинэ даалгавар үүсгэх
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const taskNameVal = (
                  form.elements.namedItem("taskName") as HTMLInputElement
                ).value.trim();
                const taskWeightVal = (
                  form.elements.namedItem("taskWeight") as HTMLInputElement
                ).value.trim();
                const taskRoleVal = (
                  form.elements.namedItem("taskRole") as HTMLSelectElement
                ).value;

                if (!taskNameVal) return;
                setLoading(true);

                const { error } = await supabase.from("tasks").insert([
                  {
                    client_id: activeClient,
                    role: taskRoleVal,
                    task_name: taskNameVal,
                    weight: parseInt(taskWeightVal) || 10,
                  },
                ]);

                if (error) alert(`Алдаа: ${error.message}`);
                else {
                  form.reset();
                  await fetchDatabaseData(activeClient);
                }
                setLoading(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  Хэнд оноох вэ?
                </label>
                <select
                  name="taskRole"
                  defaultValue="Бүх ажилтан"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                >
                  <option value="Бүх ажилтан">Бүх ажилтан (Бүгд хийх)</option>
                  <optgroup label="Үүргээр оноох">
                    {companyRoles.map((r) => (
                      <option key={r.id} value={r.role_name}>
                        🏷️ {r.role_name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Нэр зааж оноох">
                    {workersList.map((w) => (
                      <option
                        key={w.id}
                        value={w.full_name || w.email.split("@")[0]}
                      >
                        👤 {w.full_name || w.email.split("@")[0]}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  Даалгаврын нэр
                </label>
                <input
                  name="taskName"
                  type="text"
                  required
                  placeholder="Жнь: Кофены машин угаах"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  Ачааллын жин (Оноо 1-100)
                </label>
                <input
                  name="taskWeight"
                  type="number"
                  required
                  defaultValue={15}
                  placeholder="Жнь: 15"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold outline-none focus:border-zinc-700"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold py-3 rounded-xl transition text-sm cursor-pointer"
              >
                Даалгавар Нэмэх
              </button>
            </form>
          </div>

          {/* Tasks List */}
          <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 md:col-span-2">
            <h3 className="text-base font-bold mb-4">Бүртгэлтэй Даалгаврууд</h3>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-800 uppercase">
                    <th className="pb-3 px-2">Оноосон Хаяг</th>
                    <th className="pb-3 px-2">Даалгаврын нэр</th>
                    <th className="pb-3 px-2">Ачаалал</th>
                    <th className="pb-3 px-2">Үүсгэсэн Огноо (Цаг, Минут)</th>
                    <th className="pb-3 px-2 text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {tasks.filter((t) => t.client_id === activeClient).length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-slate-500 italic"
                      >
                        Даалгавар байхгүй байна.
                      </td>
                    </tr>
                  ) : (
                    tasks
                      .filter((t) => t.client_id === activeClient)
                      .map((t) => (
                        <tr key={t.id} className="hover:bg-slate-900/30">
                          <td className="py-3 px-2 text-zinc-200 font-bold">
                            {t.role}
                          </td>
                          <td className="py-3 px-2 font-semibold text-slate-200">
                            {t.task_name}
                          </td>
                          <td className="py-3 px-2 text-zinc-300 font-bold">
                            {t.weight} pts
                          </td>

                          {/* EXACT TIMESTAMPS: Year, Month, Day, Hour, Minute, Second */}
                          <td className="py-3 px-2 text-slate-400 text-sm font-mono">
                            {t.created_at
                              ? new Date(t.created_at).toLocaleString("mn-MN", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : "-"}
                          </td>

                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={async () => {
                                await supabase
                                  .from("tasks")
                                  .delete()
                                  .eq("id", t.id);
                                fetchDatabaseData(activeClient);
                              }}
                              className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg text-sm font-bold transition"
                            >
                              Устгах
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Closed Shifts Report Table */}
          <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 md:col-span-3 mt-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-300">
              <Activity className="h-5 w-5" /> Хаагдсан ээлжүүдийн түүх (Shift
              History)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-800 uppercase tracking-wider font-bold">
                    <th className="py-3 px-2">Ажилтан (Үүрэг)</th>
                    <th className="py-3 px-2">Эхэлсэн огноо</th>
                    <th className="py-3 px-2">Хаагдсан огноо</th>
                    <th className="py-3 px-2">Даалгаврын гүйцэтгэл</th>
                    <th className="py-3 px-2 text-right">Ээлжийн Статус</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-800/50">
                  {shifts.filter(
                    (s) => s.client_id === activeClient && !s.is_active,
                  ).length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500 italic"
                      >
                        Хаагдсан ээлж одоогоор байхгүй байна.
                      </td>
                    </tr>
                  ) : (
                    shifts
                      .filter(
                        (s) => s.client_id === activeClient && !s.is_active,
                      )
                      .map((s) => {
                        // Calculate task completion percentage
                        let tasksList = s.daily_tasks_checklist || [];
                        if (typeof tasksList === "string")
                          tasksList = JSON.parse(tasksList);
                        let completed = tasksList.filter(
                          (t: any) => t.done,
                        ).length;
                        let total = tasksList.length;
                        let percentage =
                          total > 0
                            ? Math.round((completed / total) * 100)
                            : 100;

                        return (
                          <tr key={s.id} className="hover:bg-slate-900/30">
                            <td className="py-3 px-2 font-bold text-slate-200">
                              {s.character_role || "Ерөнхий ажилтан"}
                            </td>
                            <td className="py-3 px-2 text-slate-400">
                              {new Date(s.start_time).toLocaleString("mn-MN")}
                            </td>
                            <td className="py-3 px-2 text-slate-400">
                              {s.end_time
                                ? new Date(s.end_time).toLocaleString("mn-MN")
                                : "-"}
                            </td>
                            <td className="py-3 px-2 font-semibold">
                              {total > 0 ? (
                                <span
                                  className={
                                    percentage >= 80
                                      ? "text-zinc-200"
                                      : "text-zinc-300"
                                  }
                                >
                                  {percentage}% ({completed}/{total})
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">
                                  Даалгавар байхгүй
                                </span>
                              )}
                            </td>
                            {/* Replace the Status <td> with this: */}
                            <td className="py-3 px-2 text-right flex items-center justify-end gap-2">
                              {s.start_evidence_image && (
                                <button
                                  onClick={() =>
                                    setSelectedImageModal({
                                      url: s.start_evidence_image,
                                      title: `Ээлж эхлэх үеийн зураг: ${s.character_role}`,
                                    })
                                  }
                                  className="bg-zinc-800/60 hover:bg-zinc-200/20 text-zinc-300 px-2 py-1 rounded-lg text-sm font-bold border border-zinc-700/20 flex items-center gap-1"
                                >
                                  <Camera className="h-3 w-3" /> Эхлэл
                                </button>
                              )}
                              {s.pos_z_image_url && (
                                <button
                                  onClick={() =>
                                    setSelectedImageModal({
                                      url: s.pos_z_image_url,
                                      title: `ПОС Z-Тайлан: ${s.character_role}`,
                                    })
                                  }
                                  className="bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 px-2 py-1 rounded-lg text-sm font-bold border border-zinc-700/20 flex items-center gap-1"
                                >
                                  <Camera className="h-3 w-3" /> Z-Тайлан
                                </button>
                              )}
                              <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg text-sm font-bold uppercase">
                                Closed
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
