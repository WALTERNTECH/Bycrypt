import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminLoginFlow } from "./AdminLoginFlow";

// The setup prompt depends on live state, so this can't be cached.
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const supabase = createClient();
  const { data: taken } = await supabase.rpc("admin_seat_taken");

  return (
    <>
      <AdminLoginFlow />
      {!taken && (
        // Only shown while no admin exists, so the first run is findable
        // without knowing the URL — and invisible forever after.
        <div className="px-4 pb-10">
          <div className="mx-auto max-w-sm rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-text-primary">No admin account yet</p>
            <p className="mt-1 text-xs text-text-secondary">
              Krypton needs its administrator before anyone can sign in.
            </p>
            <Link
              href="/register"
              className="mt-2 inline-block text-sm font-bold text-brand hover:underline"
            >
              Set up the admin account →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
