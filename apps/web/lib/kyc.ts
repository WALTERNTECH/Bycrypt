export const ID_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's licence" }
] as const;

export type IdType = (typeof ID_TYPES)[number]["value"];

export const MAX_KYC_FILE_BYTES = 8 * 1024 * 1024; // 8MB
export const ALLOWED_KYC_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function kycFileExtension(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}
