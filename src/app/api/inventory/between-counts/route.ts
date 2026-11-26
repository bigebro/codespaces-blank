import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerSupabase } from "@/lib/supabaseServer";
import { loadBetweenCounts } from "@/lib/betweenCountsLoad";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseSecure = createServerSupabase(token);
    const { data: profile } = await supabaseSecure
      .from("profiles")
      .select("client_id, role")
      .eq("id", user.id)
      .single();
    if (!profile?.client_id || profile.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(await loadBetweenCounts(profile.client_id));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Алдаа гарлаа" }, { status: 500 });
  }
}
