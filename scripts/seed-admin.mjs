#!/usr/bin/env node
// One-time script to create the first super_admin account.
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-admin.mjs "you@example.com" "a-strong-password" "Your Name"
//
// This intentionally is NOT an HTTP route — admin accounts are never
// created through public signup (TDD Section 11, Build & Launch Checklist).

import { createClient } from "@supabase/supabase-js";

const [, , email, password, fullName] = process.argv;

if (!email || !password || !fullName) {
  console.error('Usage: node scripts/seed-admin.mjs "email" "password" "Full Name"');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { is_admin: true } // tells the profiles-bootstrap trigger to skip this user
});

if (createError) {
  console.error("Failed to create auth user:", createError.message);
  process.exit(1);
}

const { error: adminError } = await supabase.from("admin_users").insert({
  id: created.user.id,
  full_name: fullName,
  role: "super_admin",
  is_active: true
});

if (adminError) {
  console.error("Auth user created, but failed to insert admin_users row:", adminError.message);
  console.error(`User id was ${created.user.id} — you can insert the row manually.`);
  process.exit(1);
}

console.log(`Super admin created: ${email} (${created.user.id})`);
console.log("Log in at the admin app and enroll TOTP on first login — it's required before any admin data is reachable.");
