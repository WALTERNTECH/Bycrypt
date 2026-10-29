import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegisterFlow } from "./RegisterFlow";

// Checked per request, never cached: the whole point is that this page
// stops existing the moment the seat is taken.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = createClient();
  const { data: taken } = await supabase.rpc("admin_seat_taken");

  // Once an admin exists this route is closed. The database enforces the
  // same rule, so this is about not showing a form that cannot succeed.
  if (taken) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h1 className="text-xl font-bold text-text-primary">Set up the admin account</h1>
          <p className="mt-1 text-sm text-text-secondary">
            No administrator exists yet. This creates the one admin account for Krypton — once it
            exists, this page closes and no second account can be created.
          </p>

          <div className="mt-5">
            <RegisterFlow />
          </div>

          <p className="mt-5 text-center text-xs text-text-secondary">
            Already set up?{" "}
            <Link href="/login" className="font-semibold text-brand">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
