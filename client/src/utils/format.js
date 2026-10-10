const currency0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const currency2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 2 });
const compactCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const dateOnly = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** KPI totals: whole dollars. */
export const formatCurrency = (value) => currency0.format(toNumber(value));
/** Unit values (prices, single orders): cents. */
export const formatCurrencyPrecise = (value) => currency2.format(toNumber(value));
/** Chart axes: $1.5K. */
export const formatCurrencyCompact = (value) => compactCurrency.format(toNumber(value));
export const formatNumber = (value) => integer.format(toNumber(value));
export const formatNumberCompact = (value) => compactNumber.format(toNumber(value));
export const formatPercent = (value, digits = 1) => `${toNumber(value).toFixed(digits)}%`;

/** "2 Oct 2026, 14:05" */
export function formatDateTime(value) {
  const date = toDate(value);
  return date ? dateTime.format(date) : '—';
}
/** "2 Oct 2026" */
export function formatDate(value) {
  const date = toDate(value);
  return date ? dateOnly.format(date) : '—';
}
/** "2 Oct", for chart axes. */
export function formatDayMonth(value) {
  const date = toDate(value);
  return date ? dayMonth.format(date) : '';
}

// "1.4.0" -> "v1.4.0"; labels such as "dev" or "main-42" are shown as they are.
export const formatVersion = (version) => (/^\d/.test(String(version || '')) ? `v${version}` : String(version || ''));

export const shortSha = (sha) => (sha ? String(sha).slice(0, 7) : '');

/** Returns e.g. "+4.2% vs previous period", or null when there is no usable prior period. */
export function formatPeriodChange(current, previous) {
  if (typeof previous !== 'number' || !(previous > 0)) return null;
  const change = ((toNumber(current) - previous) / previous) * 100;
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  return `${sign}${Math.abs(change).toFixed(1)}% vs previous period`;
}

export const RANGE_OPTIONS = [
  { value: 'today', label: 'Today', period: 'Today' },
  { value: '7d', label: '7 days', period: 'Last 7 days' },
  { value: '30d', label: '30 days', period: 'Last 30 days' },
  { value: 'quarter', label: '90 days', period: 'Last 90 days' }
];
export const rangePeriod = (range) => RANGE_OPTIONS.find((option) => option.value === range)?.period || '';

export const roleLabel = (role) => (role === 'User' ? 'Employee' : role);
