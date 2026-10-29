import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Marks every unread notification as read for the caller.
 *
 * Scoped by auth.uid() through the user's own client, so RLS decides
 * whose rows these are — the route never names a user id and so cannot
 * be pointed at someone else's notifications.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return NextResponse.json({ error: "Could not update." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
