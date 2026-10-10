import React, { useMemo } from 'react';
import { KpiStrip } from '../common/KpiStrip';
import { DataTable } from '../common/DataTable';
import { RangeSelector } from '../common/RangeSelector';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge, salesStatusTone } from '../common/StatusBadge';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '../common/WidgetStates';
import { SalesChart } from '../charts/SalesChart';
import { formatCurrency, formatCurrencyPrecise, formatDateTime, formatNumber, formatPeriodChange, rangePeriod } from '../../utils/format';

const columns = [
  { key: 'clientName', header: 'Client' },
  { key: 'totalAmount', header: 'Amount', align: 'right', render: (row) => formatCurrencyPrecise(row.totalAmount) },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge tone={salesStatusTone(row.status)}>{row.status || 'Unknown'}</StatusBadge> },
  { key: 'createdAt', header: 'Date', render: (row) => <span className="num">{formatDateTime(row.createdAt)}</span> }
];

export function SalesSection({ queryState, range, onRangeChange, devTools = null }) {
  const { data, isLoading, isError, error, refetch, isFetching } = queryState;
  const summary = data?.summary;
  const items = useMemo(() => data?.data || [], [data]);
  const recent = useMemo(() => [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [items]);
  const period = rangePeriod(range);
  const trend = summary ? formatPeriodChange(summary.totalRevenue, summary.previousPeriodRevenue) : null;

  return (
    <section className="section" aria-labelledby="sales-title">
      <SectionHeader id="sales-title" title="Sales" description="Orders and revenue for the selected period." onRefresh={refetch} isFetching={isFetching}>
        <RangeSelector value={range} onChange={onRangeChange} label="Sales period" />
      </SectionHeader>

      {isLoading ? <WidgetSkeleton label="Loading sales" />
        : isError ? <WidgetError error={error} onRetry={refetch} title="Sales data unavailable" />
        : items.length === 0 ? <WidgetEmpty title="No sales orders" message="No orders were recorded in this period." />
        : <>
          <KpiStrip label="Sales figures" items={[
            { label: 'Revenue', value: formatCurrency(summary?.totalRevenue), period, note: trend || 'No prior-period data' },
            { label: 'Orders', value: formatNumber(summary?.orderCount), period },
            { label: 'Average order', value: formatCurrencyPrecise(summary?.averageOrderValue), period },
            { label: 'Completed', value: formatNumber(summary?.completedOrders), period, note: `${formatNumber(summary?.pendingOrders)} pending, ${formatNumber(summary?.refundedOrders)} refunded` }
          ]} />
          <SalesChart data={items} />
          <DataTable caption="Recent orders" columns={columns} rows={recent} />
        </>}
      {devTools}
    </section>
  );
}
