import { NextRequest, NextResponse } from "next/server";
import { fetchNews, filterNews, type NewsCategory } from "@/lib/news";

// Five minutes. The desks publish on the order of minutes, and a feed
// people scroll constantly should not re-fetch five RSS endpoints on
// every page of every scroll.
export const revalidate = 300;

const VALID = new Set(["all", "bitcoin", "ethereum", "altcoins", "markets", "regulation"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(30, Math.max(1, Number(searchParams.get("limit") ?? 12) || 12));
  const raw = searchParams.get("category") ?? "all";
  const category = (VALID.has(raw) ? raw : "all") as NewsCategory;

  const all = await fetchNews();
  const items = filterNews(all, category);

  const start = (page - 1) * limit;
  const slice = items.slice(start, start + limit);

  return NextResponse.json({
    items: slice,
    page,
    // Null rather than a page number that would come back empty, so the
    // scroller knows it has reached the end instead of asking forever.
    nextPage: start + limit < items.length ? page + 1 : null,
    total: items.length
  });
}
