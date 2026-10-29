import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildExpectedAmount, fetchBtcUsdRate } from "@/lib/bitcoin";
import { sendAdminAlert } from "@/lib/adminEmail";

const bodySchema = z.object({
  amount_usd: z.number().positive()
});

/**
 * Starts a deposit.
 *
 * Nothing is typed in by the user beyond the dollar figure they want to
 * fund. No transaction ID, no transaction key — the row is created here
 * with the exact amount of BTC it expects to receive, the user sends that
 * amount, and pressing Verify scans the receiving address for it.
 *
 * The exact amount is the dollar figure converted at the live rate, with
 * the last three satoshi digits replaced by a tag that no other pending
 * deposit holds. That tag is what makes an address scan able to tell two
 * deposits apart without a transaction ID — see lib/bitcoin.ts.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Enter the amount you want to deposit." }, { status: 400 });

  const admin = createAdminClient();

  const [{ data: addressCfg }, { data: minCfg }, { data: profile }] = await Promise.all([
    admin.from("platform_config").select("value").eq("key", "receiving_wallet_address").maybeSingle(),
    admin.from("platform_config").select("value").eq("key", "min_deposit_usdt").maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
  ]);

  const address = addressCfg?.value;
  if (!address || address.startsWith("REPLACE_WITH_")) {
    return NextResponse.json(
      { error: "Deposits are disabled until an operator sets the receiving Bitcoin address." },
      { status: 503 }
    );
  }

  const minDeposit = parseFloat(minCfg?.value ?? "10");
  if (parsed.data.amount_usd < minDeposit) {
    return NextResponse.json({ error: `The minimum deposit is $${minDeposit}.` }, { status: 400 });
  }

  const rateUsd = await fetchBtcUsdRate();
  if (!rateUsd) {
    return NextResponse.json(
      { error: "We can't price BTC right now, so we can't tell you what to send. Try again in a moment." },
      { status: 503 }
    );
  }

  // Tags only need to be unique among deposits still waiting to be
  // matched — once a deposit is confirmed or rejected its tag is free.
  const { data: pending } = await admin
    .from("deposits")
    .select("amount_tag")
    .eq("status", "pending_verification")
    .not("amount_tag", "is", null);

  const built = buildExpectedAmount(
    parsed.data.amount_usd,
    rateUsd,
    (pending ?? []).map((d: any) => Number(d.amount_tag))
  );
  if (!built) {
    return NextResponse.json({ error: "Too many deposits are in progress. Try again shortly." }, { status: 503 });
  }

  // Inserted as the authenticated user so RLS enforces user_id = auth.uid().
  const { data: deposit, error: insertError } = await supabase
    .from("deposits")
    .insert({
      user_id: user.id,
      network: "BTC",
      token: "BTC",
      claimed_amount: parsed.data.amount_usd,
      expected_btc: built.expectedBtc,
      amount_tag: built.tag
    })
    .select("id")
    .single();

  if (insertError || !deposit) {
    return NextResponse.json({ error: "Could not start that deposit. Try again." }, { status: 500 });
  }

  // Notify admins — this is the reconciliation queue entry, independent
  // of whether automatic verification later succeeds.
  const { data: admins } = await admin.from("admin_users").select("id").eq("is_active", true);
  if (admins && admins.length > 0) {
    await admin.from("notifications").insert(
      admins.map((a) => ({
        admin_id: a.id,
        type: "deposit_submitted",
        message: `${profile?.full_name ?? "A user"} started a $${parsed.data.amount_usd} deposit — expecting ${built.expectedBtc} BTC.`
      }))
    );
  }

  void sendAdminAlert({
    kind: "deposit",
    userName: profile?.full_name ?? "A user",
    userEmail: user.email,
    amount: parsed.data.amount_usd,
    detail: `Expecting exactly ${built.expectedBtc} BTC to ${address}`,
    actionPath: "/dashboard/deposits"
  });

  return NextResponse.json(
    {
      deposit_id: deposit.id,
      address,
      expected_btc: built.expectedBtc,
      amount_usd: parsed.data.amount_usd,
      rate_usd: rateUsd
    },
    { status: 201 }
  );
}
