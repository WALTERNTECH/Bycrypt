import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapPositionRow, POSITION_COLUMNS } from "@/lib/position";
import { settlePosition } from "@/lib/settle";

/**
 * Closes a position and moves its settled value into the wallet.
 *
 * The value is recomputed server-side in settlePosition() from live
 * exchange data — measured from the price the position was opened at, in
 * the direction the position was opened on. A winning position credits
 * more than was invested; a losing one credits less. That is the bug this
 * route carried: profit was floored at zero, so closing a losing position
 * returned the invested amount intact and the wallet never moved.
 *
 * The row is read through the caller's own client, not the service role.
 * RLS on investments already restricts SELECT to the owner, so this both
 * enforces ownership and keeps settlement working if the service-role key
 * is absent — with the admin client, a missing key silently produced a
 * zero profit and paid back the principal alone.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ data: row }, { data: profile }] = await Promise.all([
    supabase.from("investments").select(POSITION_COLUMNS).eq("id", params.id).maybeSingle(),
    supabase.from("profiles").select("is_simulated").eq("id", user.id).maybeSingle()
  ]);

  if (!row) return NextResponse.json({ error: "Position not found." }, { status: 404 });
  if ((row as any).status === "withdrawn") {
    return NextResponse.json({ error: "This position has already been closed." }, { status: 400 });
  }

  const outcome = await settlePosition(supabase, mapPositionRow(row), profile?.is_simulated === true);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 400 });

  return NextResponse.json({
    ok: true,
    credited: outcome.credited,
    pnl: outcome.pnl,
    exit_price: outcome.exitPrice
  });
}
