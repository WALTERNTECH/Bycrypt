import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { pickTopGainer } from "@/lib/pickTopGainer";
import { verifyTransactionKey } from "@/lib/transactionKey";

const bodySchema = z.object({
  tier_id: z.number().int().positive(),
  amount: z.number().positive(),
  transaction_key: z.string().min(1),
  symbol: z.string().max(20).optional()
});

// Allocates wallet balance into a tiered investment. All the actual
// validation (KYC, sufficient balance, active tier) happens inside the
// buy_investment() Postgres function — this route just authenticates,
// checks the transaction key, picks a display symbol, and calls it.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("transaction_key_hash, kyc_status")
    .eq("id", user.id)
    .single();

  if (!verifyTransactionKey(parsed.data.transaction_key, profile?.transaction_key_hash)) {
    return NextResponse.json({ error: "Incorrect transaction key." }, { status: 403 });
  }
  if (profile?.kyc_status !== "approved") {
    return NextResponse.json({ error: "Verify your identity before trading." }, { status: 403 });
  }

  let tradedSymbol = parsed.data.symbol?.toUpperCase() ?? null;
  if (tradedSymbol) {
    // Trust only a symbol we actually list and that's active.
    const { data: match } = await supabase
      .from("market_symbols")
      .select("symbol")
      .eq("symbol", tradedSymbol)
      .eq("is_active", true)
      .maybeSingle();
    if (!match) tradedSymbol = null;
  }
  if (!tradedSymbol) {
    const { data: symbols } = await supabase.from("market_symbols").select("symbol").eq("is_active", true);
    tradedSymbol = await pickTopGainer((symbols ?? []).map((s) => s.symbol));
  }

  const { data: investmentId, error } = await supabase.rpc("buy_investment", {
    p_tier_id: parsed.data.tier_id,
    p_amount: parsed.data.amount,
    p_traded_symbol: tradedSymbol
  });

  if (error) {
    const messages: Record<string, string> = {
      kyc_required: "Verify your identity before trading.",
      insufficient_balance: "Your wallet balance is too low for that amount.",
      invalid_tier: "That plan isn't available.",
      invalid_amount: "Enter a valid amount.",
      not_authenticated: "Please log in again.",
      position_already_open: "You already have an open position — close it first, then open a new one."
    };
    const reason = Object.keys(messages).find((k) => error.message.includes(k));
    return NextResponse.json({ error: reason ? messages[reason] : "Could not complete that trade." }, { status: 400 });
  }

  return NextResponse.json({ investment_id: investmentId, traded_symbol: tradedSymbol }, { status: 201 });
}
