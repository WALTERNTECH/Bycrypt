import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: moved, error } = await supabase.rpc("move_referral_to_wallet");
  if (error) {
    const message = error.message.includes("nothing_to_move")
      ? "You don't have any referral earnings to move yet."
      : "Could not move your referral earnings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, moved });
}
