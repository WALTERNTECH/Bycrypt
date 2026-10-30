import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { AutoCloseWatcher } from "@/components/AutoCloseWatcher";
import { SimulationProvider } from "@/components/SimulationProvider";
import { PositionLiveProvider } from "@/components/PositionLiveProvider";
import { mapPositionRow, POSITION_COLUMNS } from "@/lib/position";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: openPosition }] = await Promise.all([
    supabase.from("profiles").select("is_simulated").eq("id", user.id).maybeSingle(),
    // The open position is read here, in the shell, so the auto-close
    // watcher runs on every signed-in screen rather than only on the one
    // that happens to show the position.
    supabase
      .from("investments")
      .select(POSITION_COLUMNS)
      .eq("user_id", user.id)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  // Read once, here, and handed down. No screen can disagree with
  // another about whether this account's figures are simulated.
  const simulated = profile?.is_simulated === true;

  return (
    <SimulationProvider simulated={simulated}>
      <PositionLiveProvider hasPosition={!!openPosition}>
      <div className="min-h-screen bg-base">
        {/* The ticker used to live here, pinned under the header, where a
            constantly sliding strip sat above everything the user was
            actually trying to read. It now sits further down the page, in
            the flow, as a market section rather than as chrome.
            pt-[env(safe-area-inset-top)] keeps the bar clear of the notch
            when launched from the home screen. */}
        <header className="sticky top-0 z-40 bg-header pt-[env(safe-area-inset-top)]">
          <TopBar />
        </header>

        <main className="mx-auto w-full max-w-lg pb-24 lg:max-w-[1180px] lg:px-6 lg:pb-12">
            {children}
          </main>

        <AutoCloseWatcher row={openPosition ? mapPositionRow(openPosition) : null} />
        <BottomNav />
        </div>
      </PositionLiveProvider>
    </SimulationProvider>
  );
}
