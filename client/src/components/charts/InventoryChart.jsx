import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

function CustomInventoryTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isLow = data.quantity <= data.minStockLevel;

    return (
      <div className="custom-tooltip">
        <div className="tooltip-title">{data.name}</div>
        <div className="tooltip-row">
          <span>SKU:</span>
          <span className="tooltip-value">{data.sku}</span>
        </div>
        <div className="tooltip-row">
          <span>In Stock:</span>
          <span className="tooltip-value" style={{ color: isLow ? '#ef4444' : '#f59e0b' }}>
            {data.quantity} units {isLow && '(Low Stock)'}
          </span>
        </div>
        <div className="tooltip-row">
          <span>Min Required:</span>
          <span className="tooltip-value">{data.minStockLevel} units</span>
        </div>
        <div className="tooltip-row">
          <span>Unit Price:</span>
          <span className="tooltip-value">${Number(data.unitPrice).toFixed(2)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function InventoryChart({ data = [] }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Show top 8 items or unique SKUs for clear readability
    return data.slice(0, 8).map((item) => ({
      ...item,
      displayName: item.name.length > 14 ? `${item.name.substring(0, 14)}...` : item.name,
      isLow: item.quantity <= item.minStockLevel
    }));
  }, [data]);

  if (!chartData.length) {
    return null;
  }

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <span className="chart-title">Stock Levels vs Reorder Thresholds</span>
        <div className="chart-legend-custom">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />
            <span>Optimal Stock</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#ef4444' }} />
            <span>Critical / Low</span>
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
              tickFormatter={(val) => `${val}`}
            />
            <Tooltip content={<CustomInventoryTooltip />} />
            <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isLow ? '#ef4444' : '#f59e0b'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
