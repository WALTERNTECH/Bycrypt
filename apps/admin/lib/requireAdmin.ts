import { createClient } from "@/lib/supabase/server";

export interface AdminSession {
  id: string;
  role: "super_admin" | "operations" | "viewer";
}

/**
 * Verifies the current request is from a signed-in, active admin_users
 * row. Returns null if any check fails — callers should respond
 * 401/403 in that case.
 */
export async function requireAdmin(): Promise<AdminSession | null> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!adminRow || !adminRow.is_active) return null;

  return { id: adminRow.id, role: adminRow.role as AdminSession["role"] };
}
