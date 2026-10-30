import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserEmail } from "@/lib/adminEmail";

const bodySchema = z.object({
  email: z.string().trim().email()
});

/**
 * Starts a password reset.
 *
 * The token comes from Supabase via generateLink, so it is the same
 * single-use, expiring recovery token the built-in flow uses — this route
 * does not invent a credential or store one. Only the delivery is ours,
 * because the project has no SMTP configured and Supabase's own sender
 * never arrives, which is the same reason signup is handled server-side.
 *
 * The response is identical whether or not the address has an account.
 * Telling an anonymous caller "no account with that email" turns this
 * endpoint into a way to find out who banks here.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));

  // Deliberately the same reply for a malformed address, an unknown one,
  // and a successful send.
  const uniform = NextResponse.json({
    ok: true,
    message: "If that email has a Krypton account, a reset link is on its way."
  });

  if (!parsed.success) return uniform;
  const email = parsed.data.email.toLowerCase();

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Password reset isn't available right now. Contact support." },
      { status: 500 }
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    req.nextUrl.origin.replace(/\/$/, "");

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/reset-password` }
    });

    // No such account. Same reply as success — see above.
    if (error || !data?.properties?.action_link) return uniform;

    const sent = await sendUserEmail(
      email,
      "Reset your Krypton password",
      "Reset your password",
      `Someone asked to reset the password for the Krypton account on this address.
       The link below works once and expires in an hour.`,
      { label: "Choose a new password", href: data.properties.action_link }
    );

    if (!sent.ok) {
      // The caller is anonymous, so this must not reveal whether the
      // address exists — but an operator with no mail provider needs to
      // know the feature is inert rather than merely quiet.
      console.error("[forgot-password] delivery failed:", sent.error);
    }
  } catch (e) {
    console.error("[forgot-password] unexpected:", e);
  }

  return uniform;
}
