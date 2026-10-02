import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchInventoryMetrics, fetchSalesMetrics } from '../../api/metricsApi';
import { fetchReportSummary } from '../../api/reportsApi';
import { KpiStrip } from '../common/KpiStrip';
import { DeploymentStatusBadge, StatusBadge } from '../common/StatusBadge';
import { WidgetError, WidgetSkeleton } from '../common/WidgetStates';
import { SystemStatusIndicator } from '../layout/AppHeader';
import { isLowStock } from '../sections/InventorySection';
import { formatCurrency, formatCurrencyPrecise, formatDateTime, formatNumber, formatVersion, shortSha } from '../../utils/format';

const OVERVIEW_RANGE = '30d';
const PERIOD = 'Last 30 days';

function AttentionList({ items, isLoading, errors }) {
  return (
    <section className="section" aria-labelledby="attention-title">
      <h2 id="attention-title" className="section-title">Needs attention</h2>
      {isLoading && <WidgetSkeleton label="Checking" />}
      {!isLoading && (
        <ul className="attention-list">
          {items.map((item) => (
            <li key={item.id} className="attention-item">
              <div>
                <p className="attention-reason">{item.reason}</p>
                {item.detail}
              </div>
              {item.href && <a href={item.href}>{item.linkLabel}</a>}
            </li>
          ))}
          {errors.map((message) => <li key={message} className="attention-item"><p className="attention-reason text-secondary">{message}</p></li>)}
          {items.length === 0 && errors.length === 0 && <li className="attention-item attention-none">Nothing needs attention right now.</li>}
        </ul>
      )}
    </section>
  );
}

export function Overview({ isManager, statusQuery }) {
  const summaryQuery = useQuery({ queryKey: ['reports', 'summary'], queryFn: fetchReportSummary, enabled: isManager });
  const salesQuery = useQuery({ queryKey: ['metrics', 'sales', OVERVIEW_RANGE, false], queryFn: () => fetchSalesMetrics(OVERVIEW_RANGE), enabled: !isManager });
  const inventoryQuery = useQuery({ queryKey: ['metrics', 'inventory'], queryFn: () => fetchInventoryMetrics(OVERVIEW_RANGE) });

  const summary = summaryQuery.data;
  const sales = salesQuery.data?.summary;
  const inventory = inventoryQuery.data;
  const status = statusQuery.data;

  // 1. Needs attention, built only from returned data.
  const attention = [];
  const errors = [];
  const lowStock = (inventory?.data || [])
    .filter(isLowStock)
    .sort((a, b) => (b.minStockLevel - b.quantity) - (a.minStockLevel - a.quantity));
  if (lowStock.length > 0) {
    attention.push({
      id: 'low-stock',
      reason: `${formatNumber(lowStock.length)} ${lowStock.length === 1 ? 'item is' : 'items are'} at or below reorder level`,
      detail: (
        <ul className="attention-detail">
          {lowStock.slice(0, 5).map((item) => <li key={item.id ?? item.sku}><span className="mono">{item.sku}</span> {item.name}: <span className="num">{formatNumber(item.quantity)} on hand, reorder at {formatNumber(item.minStockLevel)}</span></li>)}
        </ul>
      ),
      href: '#inventory',
      linkLabel: 'View inventory'
    });
  }
  if (inventoryQuery.isError) errors.push('Inventory could not be checked.');

  const pendingOrders = isManager ? summary?.sales?.pendingOrders : sales?.pendingOrders;
  if (pendingOrders > 0) attention.push({ id: 'pending-orders', reason: `${formatNumber(pendingOrders)} sales ${pendingOrders === 1 ? 'order is' : 'orders are'} pending`, detail: <p className="attention-sub">{PERIOD}</p>, href: '#sales', linkLabel: 'View sales' });

  if (isManager) {
    if (summary?.finance?.pendingCount > 0) attention.push({ id: 'pending-finance', reason: `${formatNumber(summary.finance.pendingCount)} finance ${summary.finance.pendingCount === 1 ? 'transaction is' : 'transactions are'} pending`, detail: <p className="attention-sub">{PERIOD}</p>, href: '#finance', linkLabel: 'View finance' });
    const latest = summary?.deployments?.latest;
    if (latest && String(latest.status).toLowerCase() === 'failed') attention.push({ id: 'failed-deploy', reason: `Latest deployment ${latest.version || ''} to ${latest.environment || 'unknown environment'} failed`, detail: <p className="attention-sub num">{formatDateTime(latest.started_at)}</p>, href: '#deployments', linkLabel: 'View deployments' });
    if (summaryQuery.isError) errors.push('The business summary could not be loaded, so orders, finance and deployments were not checked.');
  } else if (salesQuery.isError) {
    errors.push('Sales could not be checked.');
  }

  if (statusQuery.isError || (status && status.ready === false)) {
    attention.push({ id: 'system', reason: statusQuery.isError ? 'The system status check failed' : `The system reports it is not ready (database ${status.database || 'unknown'})`, detail: <p className="attention-sub">See System below.</p> });
  }

  const attentionLoading = inventoryQuery.isLoading || (isManager ? summaryQuery.isLoading : salesQuery.isLoading);

  // 2. Business summary.
  let kpis = null;
  let kpiState = null;
  if (isManager) {
    if (summaryQuery.isLoading) kpiState = <WidgetSkeleton label="Loading summary" />;
    else if (summaryQuery.isError) kpiState = <WidgetError title="Summary unavailable" error={summaryQuery.error} onRetry={summaryQuery.refetch} />;
    else kpis = [
      { label: 'Revenue', value: formatCurrency(summary?.sales?.revenue), period: PERIOD },
      { label: 'Orders', value: formatNumber(summary?.sales?.orders), period: PERIOD },
      { label: 'Net profit', value: formatCurrency(summary?.finance?.netProfit), period: PERIOD },
      { label: 'Stock value', value: formatCurrency(summary?.inventory?.stockValue), period: 'Current' },
      { label: 'Low-stock items', value: formatNumber(summary?.inventory?.lowStockCount), unit: `of ${formatNumber(summary?.inventory?.itemCount)}`, period: 'Current' },
      { label: 'Headcount', value: formatNumber(summary?.hr?.headcount), period: 'Current', note: `${formatNumber(summary?.hr?.onLeave)} on leave` }
    ];
  } else if (salesQuery.isLoading || inventoryQuery.isLoading) kpiState = <WidgetSkeleton label="Loading summary" />;
  else if (salesQuery.isError || inventoryQuery.isError) kpiState = <WidgetError title="Summary unavailable" error={salesQuery.error || inventoryQuery.error} onRetry={() => { salesQuery.refetch(); inventoryQuery.refetch(); }} />;
  else kpis = [
    { label: 'Revenue', value: formatCurrency(sales?.totalRevenue), period: PERIOD },
    { label: 'Orders', value: formatNumber(sales?.orderCount), period: PERIOD },
    { label: 'Average order', value: formatCurrencyPrecise(sales?.averageOrderValue), period: PERIOD },
    { label: 'Stock value', value: formatCurrency(inventory?.summary?.stockValue), period: 'Current' },
    { label: 'Low-stock items', value: formatNumber(inventory?.summary?.lowStockCount), unit: `of ${formatNumber(inventory?.summary?.itemCount)}`, period: 'Current' }
  ];

  const latest = summary?.deployments?.latest;

  return (
    <>
      <AttentionList items={attention} errors={errors} isLoading={attentionLoading} />

      <section className="section" aria-labelledby="business-title">
        <h2 id="business-title" className="section-title">Business summary</h2>
        <p className="section-description">Sales for the last 30 days; stock and headcount as they stand now.</p>
        {kpiState || <KpiStrip label="Business summary" items={kpis} />}
      </section>

      <section className="section" aria-labelledby="system-title">
        <h2 id="system-title" className="section-title">System</h2>
        <dl className="facts">
          <div><dt>Status</dt><dd><SystemStatusIndicator statusQuery={statusQuery} /></dd></div>
          <div><dt>Database</dt><dd>{status?.database ? <StatusBadge tone={status.database === 'connected' ? 'success' : 'danger'}>{status.database === 'connected' ? 'Connected' : 'Unreachable'}</StatusBadge> : '—'}</dd></div>
          <div><dt>Environment</dt><dd>{status?.environment || '—'}</dd></div>
          <div><dt>Version</dt><dd className="mono" title={status?.commitSha}>{status?.version ? formatVersion(status.version) : '—'}{status?.commitSha ? ` · ${shortSha(status.commitSha)}` : ''}</dd></div>
          <div><dt>Built</dt><dd className="num">{formatDateTime(status?.builtAt)}</dd></div>
          {isManager && (
            <div>
              <dt>Latest deployment</dt>
              <dd>
                {summaryQuery.isLoading ? '…' : latest
                  ? <span className="inline-gap"><span className="cell-strong">{latest.version}</span> {latest.environment} <DeploymentStatusBadge status={latest.status} /> <span className="num text-secondary">{formatDateTime(latest.started_at)}</span></span>
                  : 'None recorded'}
                {' '}<a href="#deployments">View deployments</a>
              </dd>
            </div>
          )}
        </dl>
        {isManager && summary?.deployments?.failedLast7d > 0 && <p className="text-secondary num">{formatNumber(summary.deployments.failedLast7d)} failed deployments in the last 7 days.</p>}
      </section>
    </>
  );
}
