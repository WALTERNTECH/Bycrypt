import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isValidTxHash, normalizeTxHash } from "@/lib/tron-address";
import { runDepositVerification } from "@/lib/depositVerification";

const bodySchema = z.object({
  tier_id: z.number().int().positive(),
  tx_hash: z.string().min(10)
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const txHash = normalizeTxHash(parsed.data.tx_hash);
  if (!isValidTxHash(txHash)) {
    return NextResponse.json({ error: "That doesn't look like a valid transaction hash." }, { status: 400 });
  }

  const { data: tier } = await supabase
    .from("investment_tiers")
    .select("id")
    .eq("id", parsed.data.tier_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!tier) {
    return NextResponse.json({ error: "That investment tier isn't available." }, { status: 400 });
  }

  // Insert as the authenticated user so RLS enforces user_id = auth.uid();
  // the DB's UNIQUE(tx_hash) constraint is the last line of defense
  // against double-crediting the same on-chain transaction.
  const { data: deposit, error: insertError } = await supabase
    .from("deposits")
    .insert({ user_id: user.id, tier_id: parsed.data.tier_id, tx_hash: txHash })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This transaction hash has already been submitted." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not create the deposit record." }, { status: 500 });
  }

  try {
    const outcome = await runDepositVerification(deposit.id);
    const httpStatus = outcome.status === "rejected" ? 400 : outcome.status === "confirmed" ? 200 : 202;
    return NextResponse.json({ deposit_id: deposit.id, ...outcome }, { status: httpStatus });
  } catch {
    return NextResponse.json(
      { deposit_id: deposit.id, status: "pending_verification", message: "Submitted — we're verifying it now." },
      { status: 202 }
    );
  }
}
