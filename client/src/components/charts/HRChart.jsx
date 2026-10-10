import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CHART, ChartFrame, ChartTooltip, axisProps, tooltipCursor } from './chartTheme';
import { formatCurrency, formatNumber } from '../../utils/format';

const hrRows = (point) => [
  ['Headcount', formatNumber(point.count)],
  ['Average salary', formatCurrency(point.avgSalary)],
  ['Average rating', `${point.avgRating.toFixed(1)} / 5`]
];

export function HRChart({ data = [] }) {
  const chartData = useMemo(() => {
    const byDepartment = new Map();
    data.forEach((employee) => {
      const department = employee.department || 'General';
      if (!byDepartment.has(department)) byDepartment.set(department, { label: department, count: 0, salary: 0, rating: 0 });
      const entry = byDepartment.get(department);
      entry.count += 1;
      entry.salary += Number(employee.salary) || 0;
      entry.rating += Number(employee.performanceRating) || 0;
    });
    return Array.from(byDepartment.values())
      .sort((a, b) => b.count - a.count)
      .map((entry) => ({ ...entry, avgSalary: entry.salary / entry.count, avgRating: entry.rating / entry.count }));
  }, [data]);

  if (!chartData.length) return null;

  return (
    <ChartFrame title="Headcount by department">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
          <YAxis {...axisProps} axisLine={false} width={36} allowDecimals={false} />
          <Tooltip cursor={tooltipCursor} content={<ChartTooltip rows={hrRows} />} />
          <Bar dataKey="count" name="Headcount" fill={CHART.accent} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
