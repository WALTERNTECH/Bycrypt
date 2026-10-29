import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDepositVerification } from "@/lib/depositVerification";

/**
 * POST — what the Verify Deposit button calls.
 * GET  — the same check, polled while a deposit sits pending.
 *
 * Both run the identical scan, so pressing the button and waiting for the
 * poll can never produce different answers.
 */
async function check(id: string) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // RLS confirms the deposit belongs to this user (or the caller is admin).
  const { data: deposit } = await supabase.from("deposits").select("id, status").eq("id", id).maybeSingle();
  if (!deposit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const outcome = await runDepositVerification(deposit.id);
    return NextResponse.json({ deposit_id: deposit.id, ...outcome });
  } catch {
    return NextResponse.json({ deposit_id: deposit.id, status: deposit.status, message: "Still checking…" });
  }
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  return check(params.id);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return check(params.id);
}
