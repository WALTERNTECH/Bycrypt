import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";

const bodySchema = z.object({ amount: z.number().positive() });

// Manual deposit reconciliation: an admin has checked the transaction
// against a block explorer themselves and confirms the amount by hand.
// This is deliberately the primary path, not a fallback — automatic
// on-chain verification runs too, but isn't relied on alone.
//
// confirm_deposit() does the status flip AND the wallet credit in one
// atomic transaction — previously these were two separate calls, and a
// drop between them could leave a deposit marked confirmed with the
// wallet never credited (this happened for real once; fixed here).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.rpc("confirm_deposit", {
    p_deposit_id: params.id,
    p_amount: parsed.data.amount
  });

  if (error) {
    const messages: Record<string, string> = {
      deposit_not_found: "Deposit not found.",
      already_confirmed: "This deposit is already confirmed.",
      invalid_amount: "Enter a valid amount."
    };
    const reason = Object.keys(messages).find((k) => error.message.includes(k));
    return NextResponse.json({ error: reason ? messages[reason] : "Failed to credit wallet." }, { status: 400 });
  }

  await logAdminAction(admin.id, "manually_credit_deposit", "deposit", params.id, { amount: parsed.data.amount });

  return NextResponse.json({ ok: true });
}
