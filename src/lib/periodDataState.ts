export type PeriodDataState = "loading" | "empty" | "ready";

export const PERIOD_EMPTY_TITLE = "Энэ хугацаанд өгөгдөл алга";
export const PERIOD_EMPTY_HINT =
  "Борлуулалт, тооллого, худалдан авалт энэ хугацаанд бүртгэгдээгүй байна.";

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function len(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

/** Хугацаанд борлуулалт, хэмжсэн бараа, бүртгэл, худалдан авалт байхгүй эсэх. */
export function isAnalyticsEmpty(data: any): boolean {
  if (!data) return true;
  const fin = data.financial_ladder || {};
  const trustTotal = num(data.data_trust?.total ?? fin.data_trust?.total);
  return (
    num(fin.revenue) === 0 &&
    num(fin.actual_cogs) === 0 &&
    num(fin.gross_profit) === 0 &&
    num(fin.net_profit) === 0 &&
    num(data.total_waste_loss) === 0 &&
    num(data.total_unexplained_waste) === 0 &&
    num(fin.purchases ?? data.total_purchases) === 0 &&
    len(data.grades) === 0 &&
    len(data.menu_performance) === 0 &&
    len(data.all_timeline_logs) === 0 &&
    len(data.logged_spoilage_items) === 0 &&
    trustTotal === 0
  );
}

export function periodDataState(opts: {
  loading?: boolean;
  analytics?: any;
  rangeKey?: string;
  appliedRangeKey?: string;
}): PeriodDataState {
  if (opts.loading) return "loading";
  if (opts.rangeKey && opts.appliedRangeKey && opts.rangeKey !== opts.appliedRangeKey) {
    return "loading";
  }
  if (!opts.analytics) return "loading";
  return isAnalyticsEmpty(opts.analytics) ? "empty" : "ready";
}
