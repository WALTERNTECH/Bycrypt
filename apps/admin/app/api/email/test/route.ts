import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { sendTestEmail, getEmailStatus } from "@/lib/adminEmail";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  return NextResponse.json(await getEmailStatus());
}

// Sends a real alert to the configured destination and returns the
// provider's actual error on failure — the whole point is that a
// misconfiguration is visible here rather than only in server logs.
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const result = await sendTestEmail();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
