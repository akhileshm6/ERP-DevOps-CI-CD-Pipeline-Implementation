import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

function CustomFinanceTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <div className="tooltip-title">{label}</div>
        <div className="tooltip-row">
          <span style={{ color: '#3b82f6' }}>Revenue:</span>
          <span className="tooltip-value">${Number(data.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="tooltip-row">
          <span style={{ color: '#f43f5e' }}>Expense:</span>
          <span className="tooltip-value">${Number(data.expense || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="tooltip-row">
          <span style={{ color: '#10b981' }}>Net Balance:</span>
          <span className="tooltip-value" style={{ color: data.net >= 0 ? '#10b981' : '#ef4444' }}>
            ${Number(data.net || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function FinanceChart({ data = [] }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const catMap = new Map();

    data.forEach((tx) => {
      const cat = tx.category || 'General';
      if (!catMap.has(cat)) {
        catMap.set(cat, {
          category: cat,
          revenue: 0,
          expense: 0
        });
      }

      const entry = catMap.get(cat);
      if (tx.transactionType === 'Revenue') {
        entry.revenue += tx.amount || 0;
      } else {
        entry.expense += tx.amount || 0;
      }
    });

    return Array.from(catMap.values())
      .slice(0, 6)
      .map((entry) => ({
        ...entry,
        displayName: entry.category.length > 14 ? `${entry.category.substring(0, 14)}...` : entry.category,
        revenue: Number(entry.revenue.toFixed(2)),
        expense: Number(entry.expense.toFixed(2)),
        net: Number((entry.revenue - entry.expense).toFixed(2))
      }));
  }, [data]);

  if (!chartData.length) {
    return null;
  }

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <span className="chart-title">Revenue vs Expense by Flow Category</span>
        <div className="chart-legend-custom">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }} />
            <span>Revenue</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#f43f5e' }} />
            <span>Expense</span>
          </div>
        </div>
      </div>
      <div style={{ width: '100%', height: '100%', minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
            <XAxis
              dataKey="displayName"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
            />
            <Tooltip content={<CustomFinanceTooltip />} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} fillOpacity={0.85} name="Revenue" />
            <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} fillOpacity={0.85} name="Expense" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
