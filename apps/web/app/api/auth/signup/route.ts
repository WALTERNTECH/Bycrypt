import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/adminEmail";

const bodySchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  // Matches the checklist on the signup screen exactly. A rule shown to
  // the user and not enforced here is decoration.
  password: z
    .string()
    .min(8)
    .max(30)
    .regex(/[a-zA-Z]/, "letter")
    .regex(/[0-9]/, "number"),
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
    const issue = parsed.error?.issues?.[0];
    const aboutPassword = issue?.path?.[0] === "password";
    return NextResponse.json(
      {
        error: aboutPassword
          ? "Password must be 8 to 30 characters and include a letter and a number."
          : "Please check your details and try again."
      },
      { status: 400 }
    );
  }
  const { full_name, email, password, ref_code } = parsed.data;

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, ref_code: ref_code || null }
  });

  if (createError) {
    const message = /already registered|already exists/i.test(createError.message)
      ? "An account with that email already exists."
      : createError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Alert support that someone joined. Deliberately not awaited into the
  // response path — a slow or failing mail provider must not delay or
  // fail an account that has already been created.
  void sendAdminAlert({
    kind: "signup",
    userName: full_name,
    userEmail: email,
    actionPath: `/dashboard/users/${created.user.id}`
  });

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
