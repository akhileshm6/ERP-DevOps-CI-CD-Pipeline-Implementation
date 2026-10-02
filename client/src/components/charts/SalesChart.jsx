import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="tooltip-title">{label}</div>
        <div className="tooltip-row">
          <span style={{ color: '#10b981' }}>Revenue:</span>
          <span className="tooltip-value">${Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        {payload[1] && (
          <div className="tooltip-row">
            <span style={{ color: '#06b6d4' }}>Orders:</span>
            <span className="tooltip-value">{payload[1].value}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function SalesChart({ data = [] }) {
  // Aggregate sales by date
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const dateMap = new Map();

    // Sort chronologically
    const sorted = [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    sorted.forEach((item) => {
      const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: dateStr,
          revenue: 0,
          orders: 0
        });
      }

      const entry = dateMap.get(dateStr);
      entry.revenue += item.totalAmount || 0;
      entry.orders += 1;
    });

    return Array.from(dateMap.values()).map((entry) => ({
      ...entry,
      revenue: Number(entry.revenue.toFixed(2))
    }));
  }, [data]);

  if (!chartData.length) {
    return null;
  }

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <span className="chart-title">Revenue Velocity & Order Trends</span>
        <div className="chart-legend-custom">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#10b981' }} />
            <span>Revenue ($)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#06b6d4' }} />
            <span>Orders</span>
          </div>
        </div>
      </div>
      <div style={{ width: '100%', height: '100%', minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="salesRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#salesRevenueGrad)"
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
