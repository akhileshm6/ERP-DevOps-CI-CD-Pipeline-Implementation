import React, { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CHART, ChartFrame, ChartTooltip, axisProps, tooltipCursor } from './chartTheme';
import { formatCurrencyCompact, formatCurrencyPrecise, formatDayMonth, formatNumber } from '../../utils/format';

const salesRows = (point) => [['Revenue', formatCurrencyPrecise(point.revenue)], ['Orders', formatNumber(point.orders)]];

export function SalesChart({ data = [] }) {
  const chartData = useMemo(() => {
    const byDay = new Map();
    [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).forEach((order) => {
      const day = String(order.createdAt || '').slice(0, 10);
      if (!day) return;
      if (!byDay.has(day)) byDay.set(day, { label: formatDayMonth(order.createdAt), revenue: 0, orders: 0 });
      const entry = byDay.get(day);
      entry.revenue += Number(order.totalAmount) || 0;
      entry.orders += 1;
    });
    return Array.from(byDay.values()).map((entry) => ({ ...entry, revenue: Math.round(entry.revenue * 100) / 100 }));
  }, [data]);

  if (!chartData.length) return null;

  // Orders get their own right-hand axis so they are visible next to revenue.
  return (
    <ChartFrame title="Revenue and orders by day" legend={[{ label: 'Revenue (left axis)', color: CHART.accent }, { label: 'Orders (right axis)', color: CHART.neutral }]}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" {...axisProps} minTickGap={16} />
          <YAxis yAxisId="revenue" {...axisProps} axisLine={false} width={56} tickFormatter={formatCurrencyCompact} />
          <YAxis yAxisId="orders" orientation="right" {...axisProps} axisLine={false} width={36} allowDecimals={false} />
          <Tooltip cursor={tooltipCursor} content={<ChartTooltip rows={salesRows} />} />
          <Bar yAxisId="orders" dataKey="orders" name="Orders" fill={CHART.neutral} fillOpacity={0.5} maxBarSize={18} isAnimationActive={false} />
          <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke={CHART.accent} strokeWidth={2} fill={CHART.accent} fillOpacity={0.12} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
