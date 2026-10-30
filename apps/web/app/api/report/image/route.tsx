import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { buildReport } from "@/lib/report";
import { Report } from "@/components/ReportDocument";
import { loadReportFonts } from "@/lib/fonts/reportFonts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Krypton report, as a PNG.
 *
 * A spreadsheet is a working file — it opens in an app the recipient may
 * not have, renders differently in each of them, and invites the figures
 * to be edited. A statement of what an account did is a document: it
 * should look the same to everyone, read instantly on a phone, and be
 * awkward to alter. So this renders to an image, server-side, at a fixed
 * size — identical whatever asked for it.
 *
 * The typeface is shipped beside this route rather than left to the
 * renderer's bundled default, which resolves to a malformed path on
 * Windows and fails the whole request. Loading it explicitly also means
 * the document is set in the same face as the app instead of a fallback.
 * Read once and held, since this is the same two files every time.
 */

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  try {
    const [r, loaded] = await Promise.all([
      buildReport(supabase, user.id, user.email ?? ""),
      Promise.resolve(loadReportFonts())
    ]);

    return new ImageResponse(<Report r={r} />, {
      width: 1200,
      height: 1700,
      fonts: loaded,
      headers: {
        "Content-Disposition": `attachment; filename="krypton-report-${new Date()
          .toISOString()
          .slice(0, 10)}.png"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    // The download button reads the status, so a failure here has to be a
    // status rather than a half-written image.
    console.error("[report image]", e);
    return new Response("Could not build the report", { status: 500 });
  }
}
