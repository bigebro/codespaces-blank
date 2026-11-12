import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/core/auth/tenant";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user || user.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const role = body.role === "manager" ? "manager" : "staff";
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  if (!email && !phone) return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("staff_invites").insert({
    client_id: user.clientId,
    email: email || null,
    phone: phone || null,
    role,
    invited_by: user.userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    success: true,
    message: "Урилга хадгалагдлаа. Тэр хүн бүртгүүлэхэд энэ бизнест staff эсвэл manager эрхээр орно.",
  });
}
