import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { runDepositVerification } from "@/lib/depositVerification";
import { logAdminAction } from "@/lib/auditLog";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  try {
    const outcome = await runDepositVerification(params.id);
    await logAdminAction(admin.id, "reverify_deposit", "deposit", params.id, { outcome: outcome.status });
    return NextResponse.json(outcome);
  } catch {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }
}
