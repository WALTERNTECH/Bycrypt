import { createClient } from "@/lib/supabase/server";
import { ConfigForm } from "./ConfigForm";

export default async function ConfigPage() {
  const supabase = createClient();
  const { data: config } = await supabase.from("platform_config").select("*").order("key");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary">Platform Config</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Runtime settings, editable without a redeploy. The receiving wallet address here is the
        one shown to every depositing user — double-check it before saving.
      </p>

      <div className="mt-6 space-y-4">
        {(config ?? []).map((c) => (
          <ConfigForm key={c.key} configKey={c.key} initialValue={c.value} />
        ))}
      </div>
    </div>
  );
}
