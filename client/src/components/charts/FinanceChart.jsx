import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CHART, ChartFrame, ChartTooltip, axisProps, tooltipCursor } from './chartTheme';
import { formatCurrencyCompact, formatCurrencyPrecise } from '../../utils/format';

const financeRows = (point) => [
  ['Revenue', formatCurrencyPrecise(point.revenue)],
  ['Expenses', formatCurrencyPrecise(point.expense)],
  ['Net', formatCurrencyPrecise(point.revenue - point.expense)]
];

export function FinanceChart({ data = [] }) {
  const chartData = useMemo(() => {
    const byCategory = new Map();
    data.forEach((tx) => {
      const category = tx.category || 'General';
      if (!byCategory.has(category)) byCategory.set(category, { label: category, revenue: 0, expense: 0 });
      const entry = byCategory.get(category);
      if (tx.transactionType === 'Revenue') entry.revenue += Number(tx.amount) || 0;
      else entry.expense += Number(tx.amount) || 0;
    });
    return Array.from(byCategory.values())
      .sort((a, b) => (b.revenue + b.expense) - (a.revenue + a.expense))
      .slice(0, 8)
  }, [data]);

  if (!chartData.length) return null;

  return (
    <ChartFrame title="Revenue and expenses by category" legend={[{ label: 'Revenue', color: CHART.accent }, { label: 'Expenses', color: CHART.neutral }]}>
      <ResponsiveContainer width="100%" height="100%">
        {/* Horizontal bars so full category names stay readable. Each category is
            either revenue or expense, so the two series stack into one bar. */}
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" {...axisProps} tickFormatter={formatCurrencyCompact} />
          <YAxis type="category" dataKey="label" {...axisProps} axisLine={false} width={190} interval={0} />
          <Tooltip cursor={tooltipCursor} content={<ChartTooltip rows={financeRows} />} />
          <Bar dataKey="revenue" name="Revenue" stackId="amount" fill={CHART.accent} maxBarSize={18} isAnimationActive={false} />
          <Bar dataKey="expense" name="Expenses" stackId="amount" fill={CHART.neutral} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
