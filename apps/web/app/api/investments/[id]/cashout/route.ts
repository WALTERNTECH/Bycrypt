import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const REASON_MESSAGES: Record<string, string> = {
  not_authenticated: "Please log in again.",
  not_found: "Investment not found.",
  already_withdrawn: "This investment has already been cashed out."
};

// Moves an investment's current value (principal + accrued return) into
// the wallet balance. Closable at any time — Krypton runs one open
// position at a time, so a user can close whatever's running (settling
// at its current accrued return, even if that's still 0) to free up
// their wallet and open a new position. Internal balance move, not an
// external transfer, so it needs no admin approval.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase.rpc("cash_out_investment", { p_investment_id: params.id });

  if (error) {
    const reason = Object.keys(REASON_MESSAGES).find((k) => error.message.includes(k));
    return NextResponse.json({ error: reason ? REASON_MESSAGES[reason] : "Could not cash out that investment." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
