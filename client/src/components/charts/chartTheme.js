import React from 'react';

export const CHART = {
  accent: '#4c8dff',
  neutral: '#7b8494',
  grid: '#272d38',
  axis: '#9aa3af',
  height: 260
};

export const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: CHART.grid }
};

export const tooltipCursor = { fill: 'rgba(154, 163, 175, 0.08)' };

export function ChartTooltip({ active, payload, rows }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{point.label}</div>
      {rows(point).map(([name, value]) => (
        <div className="chart-tooltip-row" key={name}><span>{name}</span><span className="num">{value}</span></div>
      ))}
    </div>
  );
}

export function ChartFrame({ title, legend = [], children }) {
  return (
    <figure className="chart">
      <figcaption className="chart-header">
        <span className="chart-title">{title}</span>
        {legend.length > 0 && (
          <span className="chart-legend">
            {legend.map(({ label, color }) => (
              <span key={label} className="chart-legend-item"><span className="chart-swatch" style={{ background: color }} aria-hidden="true" />{label}</span>
            ))}
          </span>
        )}
      </figcaption>
      <div className="chart-body" style={{ height: CHART.height }}>{children}</div>
    </figure>
  );
}
