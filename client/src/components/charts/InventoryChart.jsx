import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CHART, ChartFrame, ChartTooltip, axisProps, tooltipCursor } from './chartTheme';
import { formatCurrencyPrecise, formatNumber } from '../../utils/format';

const inventoryRows = (point) => [
  ['Item', point.name],
  ['SKU', point.sku],
  ['On hand', formatNumber(point.quantity)],
  ['Reorder level', formatNumber(point.minStockLevel)],
  ['Unit price', formatCurrencyPrecise(point.unitPrice)],
  ['Status', point.quantity <= point.minStockLevel ? 'Low' : 'OK']
];

/** Expects items already sorted with low stock first; charts the first 10. */
export function InventoryChart({ data = [] }) {
  const chartData = useMemo(() => data.slice(0, 10).map((item) => ({
    ...item,
    label: item.name,
    // SKUs are unique and short; several items share a product name.
    short: item.sku.replace(/^SKU-/, '')
  })), [data]);

  if (!chartData.length) return null;

  return (
    <ChartFrame title="On hand vs reorder level, lowest cover first" legend={[{ label: 'On hand', color: CHART.accent }, { label: 'Reorder level', color: CHART.neutral }]}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="short" {...axisProps} interval={0} />
          <YAxis {...axisProps} axisLine={false} width={44} allowDecimals={false} tickFormatter={formatNumber} />
          <Tooltip cursor={tooltipCursor} content={<ChartTooltip rows={inventoryRows} />} />
          <Bar dataKey="quantity" name="On hand" fill={CHART.accent} maxBarSize={24} isAnimationActive={false} />
          <Bar dataKey="minStockLevel" name="Reorder level" fill={CHART.neutral} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
