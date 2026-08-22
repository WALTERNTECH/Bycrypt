import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashTransactionKey, isValidTransactionKey } from "@/lib/transactionKey";

const bodySchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(20).optional().nullable(),
  password: z.string().min(8).max(72),
  transaction_key: z.string(),
  ref_code: z.string().max(12).optional().nullable()
});

// Signup is handled server-side and the account is created pre-confirmed.
// Supabase's own confirmation-email flow depends on Site URL / Redirect URL
// project settings and a production SMTP provider — neither is something
// this app can configure itself, and misconfiguration there is exactly what
// broke signup ("verification error"). Doing it server-side with the
// service role removes that entire failure class: no email has to be sent
// or clicked for an account to become usable.
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });
  }
  const { full_name, email, phone, password, transaction_key, ref_code } = parsed.data;

  if (!isValidTransactionKey(transaction_key)) {
    return NextResponse.json(
      { error: "Transaction key must be 6-32 letters/numbers." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone: phone || null, ref_code: ref_code || null }
  });

  if (createError) {
    const message = /already registered|already exists/i.test(createError.message)
      ? "An account with that email already exists."
      : createError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: keyError } = await admin
    .from("profiles")
    .update({ transaction_key_hash: hashTransactionKey(transaction_key) })
    .eq("id", created.user.id);

  if (keyError) {
    return NextResponse.json({ error: "Account created but setup failed — contact support." }, { status: 500 });
  }

  // Establish a real session for the new account via cookies, same as login.
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        }
      }
    }
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json({ error: "Account created — please log in." }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
