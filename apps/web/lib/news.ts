/**
 * The market news feed.
 *
 * Pulled from the public RSS of several crypto desks and merged into one
 * stream. No key, no vendor, and if a desk goes down the others carry the
 * feed — the same reasoning as the market data layer, for the same reason
 * it was needed there.
 *
 * Deliberately not a social feed. The reference design shows likes and
 * reposts under each card; this has no users posting and no engagement to
 * count, and printing "41" under an article nobody liked would be an
 * invented number on a screen full of real ones. The card keeps the shape
 * and gives the row real actions instead.
 */

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string | null;
  source: string;
  sourceKey: string;
  publishedAt: string;
  /** Tickers named in the headline, for the chips under the card. */
  symbols: string[];
}

interface Feed {
  key: string;
  name: string;
  url: string;
}

const FEEDS: Feed[] = [
  { key: "coindesk", name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { key: "cointelegraph", name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { key: "decrypt", name: "Decrypt", url: "https://decrypt.co/feed" },
  { key: "cryptopotato", name: "CryptoPotato", url: "https://cryptopotato.com/feed/" },
  { key: "newsbtc", name: "NewsBTC", url: "https://www.newsbtc.com/feed/" }
];

/** Coins this platform lists, so a chip only appears where it can be
 *  priced. Order matters: longer tickers are matched first. */
const TRACKED: { symbol: string; words: string[] }[] = [
  { symbol: "BTCUSDT", words: ["BITCOIN", "BTC"] },
  { symbol: "ETHUSDT", words: ["ETHEREUM", "ETH", "ETHER"] },
  { symbol: "SOLUSDT", words: ["SOLANA", "SOL"] },
  { symbol: "BNBUSDT", words: ["BNB", "BINANCE COIN"] },
  { symbol: "XRPUSDT", words: ["XRP", "RIPPLE"] },
  { symbol: "DOGEUSDT", words: ["DOGECOIN", "DOGE"] },
  { symbol: "ADAUSDT", words: ["CARDANO", "ADA"] },
  { symbol: "TONUSDT", words: ["TONCOIN", "TON"] }
];

export const NEWS_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "bitcoin", label: "Bitcoin" },
  { id: "ethereum", label: "Ethereum" },
  { id: "altcoins", label: "Altcoins" },
  { id: "markets", label: "Markets" },
  { id: "regulation", label: "Regulation" }
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]["id"];

/* ------------------------------------------------------------------ */
/* A small RSS reader                                                  */
/*                                                                     */
/* An XML library would be a dependency and a bundle cost for five     */
/* feeds with a fixed shape. These helpers read only what a card needs */
/* and treat anything missing as absent rather than as an error.       */
/* ------------------------------------------------------------------ */

function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8230;/g, "…")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&amp;/g, "&");
}

function stripCdata(value: string): string {
  const match = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return match ? match[1] : value;
}

function readTag(xml: string, name: string): string | null {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i");
  const match = xml.match(re);
  if (!match) return null;
  return decodeEntities(stripCdata(match[1])).trim();
}

function readAttr(xml: string, tagName: string, attrName: string): string | null {
  const re = new RegExp(`<${tagName}\\b[^>]*\\b${attrName}\\s*=\\s*["']([^"']+)["']`, "i");
  const match = xml.match(re);
  return match ? decodeEntities(match[1]) : null;
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function findImage(itemXml: string, description: string): string | null {
  const candidates = [
    readAttr(itemXml, "media:content", "url"),
    readAttr(itemXml, "media:thumbnail", "url"),
    readAttr(itemXml, "enclosure", "url"),
    readAttr(description, "img", "src")
  ];
  for (const url of candidates) {
    // Only https: an http image is blocked as mixed content and leaves a
    // hole where the picture should be.
    if (url && /^https:\/\//i.test(url)) return url;
  }
  return null;
}

function symbolsIn(title: string): string[] {
  const haystack = ` ${title.toUpperCase().replace(/[^A-Z0-9 ]/g, " ")} `;
  const found: string[] = [];
  for (const entry of TRACKED) {
    if (entry.words.some((w) => haystack.includes(` ${w} `))) found.push(entry.symbol);
  }
  return found.slice(0, 3);
}

function categorise(title: string, summary: string): NewsCategory[] {
  const text = `${title} ${summary}`.toLowerCase();
  const cats: NewsCategory[] = ["all"];
  if (/\bbitcoin\b|\bbtc\b/.test(text)) cats.push("bitcoin");
  if (/\bethereum\b|\beth\b|\bether\b/.test(text)) cats.push("ethereum");
  if (/\bsolana\b|\bxrp\b|\bripple\b|\bcardano\b|\bdoge|\baltcoin|\bbnb\b|\bton\b/.test(text)) {
    cats.push("altcoins");
  }
  if (/\bmarket|\brally|\bprice|\bsurge|\bplunge|\bdrop|\bbull|\bbear|\betf\b|\btrading\b/.test(text)) {
    cats.push("markets");
  }
  if (/\bsec\b|\bregulat|\blawsuit|\bcourt\b|\bban\b|\bpolicy\b|\bgovernment|\blegal\b/.test(text)) {
    cats.push("regulation");
  }
  return cats;
}

async function readFeed(feed: Feed): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      // Some desks refuse a request with no user agent.
      headers: { "User-Agent": "Krypton/1.0 (+news reader)", Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 300 }
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: NewsItem[] = [];
    const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

    for (const block of blocks) {
      const title = readTag(block, "title");
      const link = readTag(block, "link");
      if (!title || !link) continue;

      const rawDescription = readTag(block, "description") ?? readTag(block, "content:encoded") ?? "";
      const summary = stripHtml(rawDescription).slice(0, 240);
      const pubDate = readTag(block, "pubDate") ?? readTag(block, "dc:date");
      const published = pubDate ? new Date(pubDate) : null;

      items.push({
        id: `${feed.key}:${link}`,
        title,
        summary,
        url: link,
        image: findImage(block, rawDescription),
        source: feed.name,
        sourceKey: feed.key,
        publishedAt: (published && !Number.isNaN(published.getTime()) ? published : new Date()).toISOString(),
        symbols: symbolsIn(title)
      });
    }
    return items;
  } catch {
    // One desk being unreachable must not empty the feed.
    return [];
  }
}

export async function fetchNews(): Promise<NewsItem[]> {
  const batches = await Promise.all(FEEDS.map(readFeed));
  const all = batches.flat();

  // Two desks covering the same story is normal; the same desk listing it
  // twice is not, so dedupe on the headline.
  const seen = new Set<string>();
  const unique: NewsItem[] = [];
  for (const item of all) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  unique.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return unique;
}

export function filterNews(items: NewsItem[], category: NewsCategory): NewsItem[] {
  if (category === "all") return items;
  return items.filter((item) => categorise(item.title, item.summary).includes(category));
}
