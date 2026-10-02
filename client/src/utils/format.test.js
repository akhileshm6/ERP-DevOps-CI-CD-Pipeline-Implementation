import { formatVersion, formatCurrency, formatCurrencyPrecise, formatDate, formatDateTime, formatPeriodChange, rangePeriod, roleLabel, shortSha } from './format';

describe('currency', () => {
  test('KPI currency rounds to whole dollars with grouping', () => {
    expect(formatCurrency(12345.6)).toBe('$12,346');
    expect(formatCurrency('2500')).toBe('$2,500');
  });
  test('null, undefined and junk render as $0 rather than NaN', () => {
    expect(formatCurrency(null)).toBe('$0');
    expect(formatCurrency(undefined)).toBe('$0');
    expect(formatCurrency('abc')).toBe('$0');
  });
  test('precise currency keeps cents', () => {
    expect(formatCurrencyPrecise(4115.2)).toBe('$4,115.20');
    expect(formatCurrencyPrecise(0)).toBe('$0.00');
  });
});

describe('dates', () => {
  test('formats a date as day month year', () => {
    expect(formatDate('2026-10-02T12:00:00Z')).toBe('2 Oct 2026');
  });
  test('formats a date-time with a 24h time', () => {
    expect(formatDateTime('2026-10-02T12:00:00Z')).toMatch(/^2 Oct 2026,? \d{2}:\d{2}$/);
  });
  test('missing or invalid dates render as a dash', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime('')).toBe('—');
    expect(formatDateTime('not a date')).toBe('—');
  });
});

describe('formatPeriodChange', () => {
  test('positive, negative and flat changes', () => {
    expect(formatPeriodChange(110, 100)).toBe('+10.0% vs previous period');
    expect(formatPeriodChange(90, 100)).toBe('−10.0% vs previous period');
    expect(formatPeriodChange(100, 100)).toBe('0.0% vs previous period');
  });
  test('no trend without a usable previous period', () => {
    expect(formatPeriodChange(100, null)).toBeNull();
    expect(formatPeriodChange(100, undefined)).toBeNull();
    expect(formatPeriodChange(100, 0)).toBeNull();
    expect(formatPeriodChange(100, '100')).toBeNull();
  });
  test('a current value of 0 or null against a real prior period is -100%', () => {
    expect(formatPeriodChange(0, 50)).toBe('−100.0% vs previous period');
    expect(formatPeriodChange(null, 50)).toBe('−100.0% vs previous period');
  });
});

test('small helpers', () => {
  expect(shortSha('abcdef1234567')).toBe('abcdef1');
  expect(shortSha(null)).toBe('');
  expect(rangePeriod('7d')).toBe('Last 7 days');
  expect(rangePeriod('bogus')).toBe('');
  expect(roleLabel('User')).toBe('Employee');
  expect(roleLabel('Manager')).toBe('Manager');
});

test('formatVersion prefixes v only for numeric versions', () => {
  expect(formatVersion('1.4.0')).toBe('v1.4.0');
  expect(formatVersion('dev')).toBe('dev');
  expect(formatVersion('')).toBe('');
  expect(formatVersion(null)).toBe('');
});
