import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * One-time creation of the single admin account.
 *
 * This runs server-side with the service role rather than going through
 * client sign-up, for one reason: client sign-up is subject to the
 * project's email-confirmation setting, which leaves the account created
 * but unusable until a confirmation mail arrives. On a project with no
 * SMTP configured that mail never arrives, and setup dead-ends with no
 * way forward. Creating the user here with email_confirm set skips that
 * entirely — the first admin cannot be locked out by a mail provider
 * that was never set up.
 *
 * The gate is that no admin may already exist. Once the seat is taken
 * this route refuses, and a unique index on admin_users makes a second
 * row impossible even if it didn't.
 */

const schema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(10).max(200)
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the details and try again." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY — set it and redeploy." },
      { status: 500 }
    );
  }

  // The seat must be empty. Checked before anything is created so a
  // refused attempt leaves no orphaned auth user behind.
  const { count, error: countError } = await admin
    .from("admin_users")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return NextResponse.json({ error: "Could not verify setup state." }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "An admin account already exists." }, { status: 409 });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name }
  });

  if (createError || !created?.user) {
    const message = createError?.message ?? "";
    return NextResponse.json(
      {
        error: message.toLowerCase().includes("already")
          ? "That email already has an account. Sign in with it instead."
          : "Could not create the account."
      },
      { status: 400 }
    );
  }

  const { error: seatError } = await admin
    .from("admin_users")
    .insert({ id: created.user.id, full_name: parsed.data.full_name, is_active: true });

  if (seatError) {
    // Don't leave a usable login that isn't an admin — roll the auth user
    // back so setup can be retried cleanly.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return NextResponse.json({ error: "Could not complete setup. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
