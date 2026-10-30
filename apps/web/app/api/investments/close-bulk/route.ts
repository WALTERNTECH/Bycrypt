import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { mapPositionRow, POSITION_COLUMNS } from "@/lib/position";
import { settleMany, type CloseScope } from "@/lib/settle";

const bodySchema = z.object({
  scope: z.enum(["all", "winning", "losing"])
});

/**
 * Closes several positions in one action.
 *
 * Which ones is decided here, not by the browser. The client could post a
 * list of ids it believes are winning, but that list is drawn from a
 * figure that was true when the screen last polled — so the server
 * re-values each position at the moment it settles and applies the scope
 * to that. A position that has crossed from profit to loss in the
 * meantime is left alone under "close winning", which is what the button
 * promised.
 *
 * Accepting ids from the request would also mean trusting the caller
 * about which rows are theirs; a scope cannot express that.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose which positions to close." }, { status: 400 });
  }

  const [{ data: open }, { data: profile }] = await Promise.all([
    supabase
      .from("investments")
      .select(POSITION_COLUMNS)
      .eq("user_id", user.id)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("is_simulated").eq("id", user.id).maybeSingle()
  ]);

  const rows = (open ?? []).map(mapPositionRow);
  if (rows.length === 0) {
    return NextResponse.json({ closed: 0, skipped: 0, credited: 0, pnl: 0, ids: [], errors: [] });
  }

  const outcome = await settleMany(
    supabase,
    rows,
    profile?.is_simulated === true,
    parsed.data.scope as CloseScope
  );

  return NextResponse.json(outcome);
}
