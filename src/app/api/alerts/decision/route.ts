import { NextResponse } from "next/server";
import { resolveTenantFromRequest } from "@/lib/tenant";
import { decideAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await resolveTenantFromRequest(request);
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const decision = body.decision === "approve" ? "approve" : body.decision === "reject" ? "reject" : null;
  if (!body.alertId || !decision) {
    return NextResponse.json({ error: "alertId and decision are required" }, { status: 400 });
  }
  try {
    const alert = await decideAlert({
      clientId: session.clientId,
      alertId: body.alertId,
      userId: session.userId,
      decision,
    });
    return NextResponse.json({ alert });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
