export interface Tier {
  id: number;
  name: string;
  lockup_days: number;
  min_return_pct: number | null;
  max_return_pct: number | null;
}
