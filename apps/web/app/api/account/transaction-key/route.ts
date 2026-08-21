import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashTransactionKey, isValidTransactionKey, verifyTransactionKey } from "@/lib/transactionKey";

const bodySchema = z.object({
  current_key: z.string().min(1),
  new_key: z.string()
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (!isValidTransactionKey(parsed.data.new_key)) {
    return NextResponse.json({ error: "New transaction key must be 6-32 letters/numbers." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("transaction_key_hash")
    .eq("id", user.id)
    .single();

  if (!verifyTransactionKey(parsed.data.current_key, profile?.transaction_key_hash)) {
    return NextResponse.json({ error: "Current transaction key is incorrect." }, { status: 403 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ transaction_key_hash: hashTransactionKey(parsed.data.new_key) })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Could not update transaction key." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
