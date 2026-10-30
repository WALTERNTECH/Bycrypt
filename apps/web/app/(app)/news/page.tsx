import { NewsFeed } from "@/components/NewsFeed";
import { fetchNews } from "@/lib/news";

export const revalidate = 300;

export default async function NewsPage() {
  // The first page is rendered on the server so the screen opens with
  // stories already on it; everything after arrives as you scroll.
  const all = await fetchNews();
  const first = all.slice(0, 12);

  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="text-xl font-extrabold text-text-primary">Market news</h1>
      <p className="mt-1 text-xs text-text-secondary">
        Live from CoinDesk, Cointelegraph, Decrypt, CryptoPotato and NewsBTC.
      </p>
      <NewsFeed initialItems={first} initialNextPage={all.length > 12 ? 2 : null} />
    </div>
  );
}
