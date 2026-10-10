import React, { useMemo } from 'react';
import { KpiStrip } from '../common/KpiStrip';
import { DataTable } from '../common/DataTable';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '../common/WidgetStates';
import { InventoryChart } from '../charts/InventoryChart';
import { formatCurrency, formatDateTime, formatNumber } from '../../utils/format';

export const isLowStock = (item) => Number(item.quantity) <= Number(item.minStockLevel);

/** Low-stock first (largest shortfall first), then by lowest cover ratio. */
export function sortByStockRisk(items) {
  return [...items].sort((a, b) => {
    const lowDiff = Number(isLowStock(b)) - Number(isLowStock(a));
    if (lowDiff) return lowDiff;
    if (isLowStock(a)) return (b.minStockLevel - b.quantity) - (a.minStockLevel - a.quantity);
    return (a.quantity / (a.minStockLevel || 1)) - (b.quantity / (b.minStockLevel || 1));
  });
}

const columns = [
  { key: 'sku', header: 'SKU', render: (row) => <span className="mono">{row.sku}</span> },
  { key: 'name', header: 'Item' },
  { key: 'category', header: 'Category' },
  { key: 'quantity', header: 'On hand', align: 'right', render: (row) => formatNumber(row.quantity) },
  { key: 'minStockLevel', header: 'Reorder level', align: 'right', render: (row) => formatNumber(row.minStockLevel) },
  { key: 'status', header: 'Status', render: (row) => (isLowStock(row) ? <StatusBadge tone="danger">Low</StatusBadge> : <StatusBadge tone="success">OK</StatusBadge>) }
];

export function InventorySection({ queryState }) {
  const { data, isLoading, isError, error, refetch, isFetching } = queryState;
  const summary = data?.summary;
  const sorted = useMemo(() => sortByStockRisk(data?.data || []), [data]);
  const asOf = data?.asOf ? `As of ${formatDateTime(data.asOf)}` : undefined;

  return (
    <section className="section" aria-labelledby="inventory-title">
      <SectionHeader id="inventory-title" title="Inventory" description="Current stock on hand and items at or below reorder level." onRefresh={refetch} isFetching={isFetching} />

      {isLoading ? <WidgetSkeleton label="Loading inventory" />
        : isError ? <WidgetError error={error} onRetry={refetch} title="Inventory data unavailable" />
        : sorted.length === 0 ? <WidgetEmpty title="No inventory items" message="No stock items are recorded." />
        : <>
          <KpiStrip label="Inventory figures" items={[
            { label: 'Stock value', value: formatCurrency(summary?.stockValue), period: 'Current', note: asOf },
            { label: 'Items', value: formatNumber(summary?.itemCount), unit: 'SKUs', period: 'Current' },
            { label: 'Units on hand', value: formatNumber(summary?.totalQuantity), period: 'Current' },
            { label: 'At or below reorder level', value: formatNumber(summary?.lowStockCount), unit: 'items', period: 'Current' }
          ]} />
          <InventoryChart data={sorted} />
          <DataTable caption="Stock items, low stock first" columns={columns} rows={sorted} />
        </>}
    </section>
  );
}
