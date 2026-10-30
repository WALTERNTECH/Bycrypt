import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserEmail } from "@/lib/adminEmail";

const bodySchema = z.object({
  new_email: z.string().trim().email(),
  current_password: z.string().min(1)
});

/**
 * Changes the email on an account.
 *
 * The current password is required, and that is not a formality. The
 * email address is what the password-reset flow sends to, so whoever
 * controls it controls the account — letting a merely-open session change
 * it would mean a borrowed phone could take the account permanently, with
 * the owner locked out of their own recovery route.
 *
 * The check runs on a throwaway client with no cookie storage, so
 * verifying the password cannot disturb the session the request came in
 * on.
 *
 * The change is then applied with the service role and email_confirm set,
 * because this project has no SMTP for Supabase's own confirmation mail —
 * the same reason signup is handled server-side. The old address is told
 * what happened, which is the thing that makes an unauthorised change
 * visible to the person it was taken from.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address and your password." }, { status: 400 });
  }

  const newEmail = parsed.data.new_email.toLowerCase();
  const oldEmail = user.email.toLowerCase();

  if (newEmail === oldEmail) {
    return NextResponse.json({ error: "That is already the email on this account." }, { status: 400 });
  }

  // Re-authenticate on a client that persists nothing, so the caller's
  // own session is untouched by this check.
  const verifier = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: passwordError } = await verifier.auth.signInWithPassword({
    email: oldEmail,
    password: parsed.data.current_password
  });
  if (passwordError) {
    return NextResponse.json({ error: "That password is incorrect." }, { status: 403 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Email changes aren't available right now." }, { status: 500 });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: true
  });

  if (updateError) {
    const taken = /already|registered|exists|duplicate/i.test(updateError.message);
    return NextResponse.json(
      { error: taken ? "Another account already uses that email." : "Could not change the email." },
      { status: 400 }
    );
  }

  // In-app first: this lands whether or not a mail provider is configured.
  await admin.from("notifications").insert({
    user_id: user.id,
    type: "email_changed",
    message: `The email on your account was changed to ${newEmail}.`
  });

  // Then tell the address that just lost control of the account. Not
  // awaited into the response — the change has already happened and must
  // not hinge on mail delivery.
  void sendUserEmail(
    oldEmail,
    "The email on your Krypton account was changed",
    "Your account email was changed",
    `The email on your Krypton account was changed from <strong>${oldEmail}</strong> to
     <strong>${newEmail}</strong>. If this was you, nothing more is needed.
     <br/><br/>
     <strong>If it was not you</strong>, contact Krypton Support immediately — whoever made this
     change can now receive password resets for the account.`
  );

  return NextResponse.json({ ok: true, email: newEmail });
}
