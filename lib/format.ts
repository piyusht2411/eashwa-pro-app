/**
 * Indian-locale formatting helpers.
 *
 * Amounts across this app are INR. Use these instead of hand-rolling
 * `₹${n.toLocaleString('en-IN')}` at each call site so grouping, rounding and
 * null-handling stay consistent.
 */

const toNumber = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** `₹1,23,456` — full precision, lakh/crore grouping. */
export const formatINR = (value: unknown): string =>
  `₹${Math.round(toNumber(value)).toLocaleString("en-IN")}`;

/**
 * `₹1.2L` / `₹12.3K` / `₹1.24Cr` — for metric tiles, where a long number
 * either wraps or shrinks the type. Falls back to full digits under 1,000.
 */
export const formatINRCompact = (value: unknown): string => {
  const n = Math.round(toNumber(value));
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000)}L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)}K`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
};

/** One decimal place, but drop a trailing `.0` (1.0 → "1", 1.25 → "1.3"). */
const trim = (n: number): string => {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

/** `1,234` — plain counts with Indian grouping. */
export const formatCount = (value: unknown): string =>
  Math.round(toNumber(value)).toLocaleString("en-IN");

/** `1,234 km` */
export const formatKm = (value: unknown): string => `${formatCount(value)} km`;

/** `12 Mar 2026` — compact, unambiguous, no locale surprises. */
export const formatDate = (iso: string | Date | undefined | null): string => {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** `12 Mar – 15 Mar 2026`, collapsing the repeated year/month where possible. */
export const formatDateRange = (
  start: string | Date | undefined | null,
  end: string | Date | undefined | null,
): string => {
  if (!start || !end) return "—";
  const a = start instanceof Date ? start : new Date(start);
  const b = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—";

  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${left} – ${formatDate(b)}`;
};

/** `3 days` / `1 day` */
export const formatDays = (value: unknown): string => {
  const n = Math.round(toNumber(value));
  return `${n} ${n === 1 ? "day" : "days"}`;
};
