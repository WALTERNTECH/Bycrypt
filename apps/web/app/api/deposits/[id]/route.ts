import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDepositVerification } from "@/lib/depositVerification";

// Polled by the deposit-in-progress UI. Re-runs verification if the
// deposit is still pending (replaces the BullMQ retry loop from the TDD).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // RLS confirms the deposit belongs to this user (or the caller is admin).
  const { data: deposit } = await supabase.from("deposits").select("id, status").eq("id", params.id).maybeSingle();
  if (!deposit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const outcome = await runDepositVerification(deposit.id);
    return NextResponse.json({ deposit_id: deposit.id, ...outcome });
  } catch {
    return NextResponse.json({ deposit_id: deposit.id, status: deposit.status, message: "Still checking…" });
  }
}
