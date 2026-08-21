import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_KYC_MIME_TYPES, ID_TYPES, MAX_KYC_FILE_BYTES, kycFileExtension, type IdType } from "@/lib/kyc";

async function uploadDoc(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  label: string,
  file: File
): Promise<{ path?: string; error?: string }> {
  if (!ALLOWED_KYC_MIME_TYPES.has(file.type)) {
    return { error: `${label}: unsupported file type. Use JPG, PNG, or WEBP.` };
  }
  if (file.size > MAX_KYC_FILE_BYTES) {
    return { error: `${label}: file is too large (max 8MB).` };
  }

  const path = `${userId}/${Date.now()}-${label}.${kycFileExtension(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from("kyc-documents").upload(path, buffer, {
    contentType: file.type,
    upsert: false
  });
  if (error) return { error: `Failed to upload ${label}.` };
  return { path };
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });

  const fullName = String(form.get("full_name") ?? "").trim();
  const dateOfBirth = String(form.get("date_of_birth") ?? "").trim();
  const idType = String(form.get("id_type") ?? "") as IdType;
  const idNumber = String(form.get("id_number") ?? "").trim();
  const idFront = form.get("id_front");
  const idBack = form.get("id_back");
  const selfie = form.get("selfie");

  if (!fullName || !dateOfBirth || !idNumber) {
    return NextResponse.json({ error: "Fill in every field." }, { status: 400 });
  }
  if (!ID_TYPES.some((t) => t.value === idType)) {
    return NextResponse.json({ error: "Choose a valid ID type." }, { status: 400 });
  }
  if (!(idFront instanceof File) || idFront.size === 0) {
    return NextResponse.json({ error: "Upload the front of your ID." }, { status: 400 });
  }
  if (!(selfie instanceof File) || selfie.size === 0) {
    return NextResponse.json({ error: "Upload a selfie holding your ID." }, { status: 400 });
  }

  const admin = createAdminClient();

  const frontResult = await uploadDoc(admin, user.id, "id-front", idFront);
  if (frontResult.error) return NextResponse.json({ error: frontResult.error }, { status: 400 });

  let backPath: string | undefined;
  if (idBack instanceof File && idBack.size > 0) {
    const backResult = await uploadDoc(admin, user.id, "id-back", idBack);
    if (backResult.error) return NextResponse.json({ error: backResult.error }, { status: 400 });
    backPath = backResult.path;
  }

  const selfieResult = await uploadDoc(admin, user.id, "selfie", selfie);
  if (selfieResult.error) return NextResponse.json({ error: selfieResult.error }, { status: 400 });

  const { error: insertError } = await admin.from("kyc_submissions").insert({
    user_id: user.id,
    full_name: fullName,
    date_of_birth: dateOfBirth,
    id_type: idType,
    id_number: idNumber,
    id_front_path: frontResult.path,
    id_back_path: backPath ?? null,
    selfie_path: selfieResult.path,
    status: "pending"
  });
  if (insertError) {
    return NextResponse.json({ error: "Could not submit your verification. Try again." }, { status: 500 });
  }

  await admin.from("profiles").update({ kyc_status: "pending" }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}
