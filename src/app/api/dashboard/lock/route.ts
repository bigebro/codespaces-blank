import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const COOKIE = "operlink_dash_lock";

function locked(value: boolean) {
  const res = NextResponse.json({ locked: value });
  if (value) {
    res.cookies.set(COOKIE, "1", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
  } else {
    res.cookies.set(COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  }
  return res;
}

export async function GET(request: Request) {
  return NextResponse.json({ locked: request.headers.get("cookie")?.includes(`${COOKIE}=1`) === true });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.unlock !== true) return locked(true);

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const password = String(body.password || "");
  if (!token || !password) return NextResponse.json({ locked: true, message: "Нууц үг дутуу." }, { status: 401 });
  const { data: auth } = await supabaseAdmin.auth.getUser(token);
  const email = auth.user?.email;
  if (!email) return NextResponse.json({ locked: true, message: "Нэвтрэлт олдсонгүй." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const check = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!check.ok) {
    return NextResponse.json({ locked: true, message: "Эзний нууц үг буруу байна." }, { status: 401 });
  }
  return locked(false);
}
