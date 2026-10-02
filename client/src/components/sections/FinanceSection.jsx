import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { evaluateFlags } from '../../api/flagsApi';
import { KpiStrip } from '../common/KpiStrip';
import { DataTable } from '../common/DataTable';
import { RangeSelector } from '../common/RangeSelector';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '../common/WidgetStates';
import { FinanceChart } from '../charts/FinanceChart';
import { formatCurrency, formatCurrencyPrecise, formatDateTime, formatNumber, formatPercent, rangePeriod } from '../../utils/format';

// The category chart is released behind the `new-finance-chart` feature flag,
// resolved on the server for the caller's role. Off (or unknown) hides it.
export const FINANCE_CHART_FLAG = 'new-finance-chart';

const STATUS_TONES = { completed: 'success', cleared: 'success', paid: 'success', pending: 'warning', failed: 'danger' };

const columns = [
  { key: 'createdAt', header: 'Date', render: (row) => <span className="num">{formatDateTime(row.createdAt)}</span> },
  { key: 'category', header: 'Category' },
  { key: 'transactionType', header: 'Type' },
  { key: 'amount', header: 'Amount', align: 'right', render: (row) => (row.transactionType === 'Expense' ? `−${formatCurrencyPrecise(row.amount)}` : formatCurrencyPrecise(row.amount)) },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge tone={STATUS_TONES[String(row.status || '').toLowerCase()] || 'neutral'}>{row.status || 'Unknown'}</StatusBadge> }
];

export function FinanceSection({ queryState, range, onRangeChange }) {
  const { data, isLoading, isError, error, refetch, isFetching } = queryState;
  const summary = data?.summary;
  const items = useMemo(() => data?.data || [], [data]);
  const recent = useMemo(() => [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [items]);
  const period = rangePeriod(range);
  const flagsQuery = useQuery({ queryKey: ['flags', 'evaluate'], queryFn: evaluateFlags });
  const showChart = flagsQuery.data?.flags?.[FINANCE_CHART_FLAG] === true;

  return (
    <section className="section" aria-labelledby="finance-title">
      <SectionHeader id="finance-title" title="Finance" description="Revenue, expenses and net result for the selected period." onRefresh={refetch} isFetching={isFetching}>
        <RangeSelector value={range} onChange={onRangeChange} label="Finance period" />
      </SectionHeader>

      {isLoading ? <WidgetSkeleton label="Loading finance" />
        : isError ? <WidgetError error={error} onRetry={refetch} title="Finance data unavailable" />
        : items.length === 0 ? <WidgetEmpty title="No transactions" message="No finance transactions were recorded in this period." />
        : <>
          <KpiStrip label="Finance figures" items={[
            { label: 'Revenue', value: formatCurrency(summary?.totalRevenue), period },
            { label: 'Expenses', value: formatCurrency(summary?.totalExpenses), period },
            { label: (summary?.netProfit || 0) >= 0 ? 'Net profit' : 'Net loss', value: formatCurrency(summary?.netProfit), period, note: `${formatPercent(summary?.profitMargin)} margin` },
            { label: 'Transactions', value: formatNumber(summary?.transactionCount), period, note: `${formatNumber(summary?.pendingCount)} pending` }
          ]} />
          {showChart ? <FinanceChart data={items} /> : !flagsQuery.isLoading && (
            <p className="flag-note text-secondary">
              {flagsQuery.isError
                ? 'Category chart unavailable: feature flags could not be loaded.'
                : <>Category chart is turned off for your role by the <code>{FINANCE_CHART_FLAG}</code> feature flag.</>}
            </p>
          )}
          <DataTable caption="Recent transactions" columns={columns} rows={recent} />
        </>}
    </section>
  );
}
