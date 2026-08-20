import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTronAddress } from "@/lib/tron-address";

const bodySchema = z.object({
  investment_id: z.string().uuid(),
  destination_address: z.string().min(10)
});

// Note: this only records a withdrawal request for admin review. Bycrypt
// never holds or moves crypto funds itself (PRD 10) — an admin sends the
// payout manually from the platform's own wallet and records the tx_hash
// once approved (see admin app).
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (!isValidTronAddress(parsed.data.destination_address)) {
    return NextResponse.json({ error: "Enter a valid TRC20 (TRON) wallet address." }, { status: 400 });
  }

  // Re-check ownership + maturity server-side — never trust the client.
  const { data: investment } = await supabase
    .from("investments")
    .select("id, user_id, status, amount, accrued_return")
    .eq("id", parsed.data.investment_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!investment) return NextResponse.json({ error: "Investment not found." }, { status: 404 });
  if (investment.status !== "matured") {
    return NextResponse.json({ error: "This investment hasn't matured yet." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("withdrawals")
    .select("id")
    .eq("investment_id", investment.id)
    .in("status", ["pending", "approved", "processed"])
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "A withdrawal request already exists for this investment." }, { status: 409 });
  }

  const amount = parseFloat(String(investment.amount)) + parseFloat(String(investment.accrued_return));

  const { data: withdrawal, error: insertError } = await supabase
    .from("withdrawals")
    .insert({
      user_id: user.id,
      investment_id: investment.id,
      amount,
      destination_address: parsed.data.destination_address
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Could not create the withdrawal request." }, { status: 500 });
  }

  // Notify admins (service role — no admin-scoped RLS insert policy exists).
  const admin = createAdminClient();
  const { data: admins } = await admin.from("admin_users").select("id").eq("is_active", true);
  if (admins && admins.length > 0) {
    await admin.from("notifications").insert(
      admins.map((a) => ({
        admin_id: a.id,
        type: "withdrawal_requested",
        message: `New withdrawal request for ${amount.toFixed(2)} USDT is awaiting review.`
      }))
    );
  }

  return NextResponse.json({ withdrawal_id: withdrawal.id, status: "pending" }, { status: 201 });
}
