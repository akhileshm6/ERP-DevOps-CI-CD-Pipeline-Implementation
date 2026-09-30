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

function CustomHRTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <div className="tooltip-title">{label} Department</div>
        <div className="tooltip-row">
          <span style={{ color: '#8b5cf6' }}>Headcount:</span>
          <span className="tooltip-value">{data.count} employees</span>
        </div>
        <div className="tooltip-row">
          <span style={{ color: '#ec4899' }}>Avg Salary:</span>
          <span className="tooltip-value">${Number(data.avgSalary).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="tooltip-row">
          <span style={{ color: '#38bdf8' }}>Avg Rating:</span>
          <span className="tooltip-value">{Number(data.avgRating).toFixed(1)} / 5.0</span>
        </div>
      </div>
    );
  }
  return null;
}

export function HRChart({ data = [] }) {
  const departmentData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const map = new Map();

    data.forEach((emp) => {
      const dept = emp.department || 'General';
      if (!map.has(dept)) {
        map.set(dept, {
          department: dept,
          count: 0,
          totalSalary: 0,
          totalRating: 0
        });
      }
      const entry = map.get(dept);
      entry.count += 1;
      entry.totalSalary += emp.salary || 0;
      entry.totalRating += emp.performanceRating || 0;
    });

    return Array.from(map.values()).map((entry) => ({
      department: entry.department,
      count: entry.count,
      avgSalary: Math.round(entry.totalSalary / entry.count),
      avgRating: Number((entry.totalRating / entry.count).toFixed(2))
    }));
  }, [data]);

  if (!departmentData.length) {
    return null;
  }

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <span className="chart-title">Department Talent Distribution & Headcount</span>
        <div className="chart-legend-custom">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#8b5cf6' }} />
            <span>Staff Count</span>
          </div>
        </div>
      </div>
      <div style={{ width: '100%', height: '100%', minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <defs>
              <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
            <XAxis
              dataKey="department"
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
              allowDecimals={false}
            />
            <Tooltip content={<CustomHRTooltip />} />
            <Bar dataKey="count" fill="url(#hrGrad)" radius={[4, 4, 0, 0]} name="Headcount" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
