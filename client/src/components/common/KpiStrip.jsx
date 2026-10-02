import React from 'react';

/**
 * A single bordered strip of KPIs.
 * items: [{ label, value, unit?, period?, note? }]
 */
export function KpiStrip({ items, label = 'Key figures' }) {
  return (
    <dl className="kpi-strip" aria-label={label}>
      {items.map((item) => (
        <div className="kpi" key={item.label}>
          <dt className="kpi-label">{item.label}</dt>
          <dd className="kpi-value">
            <span className="num">{item.value}</span>
            {item.unit && <span className="kpi-unit">{item.unit}</span>}
          </dd>
          {(item.period || item.note) && (
            <dd className="kpi-meta">
              {item.period && <span>{item.period}</span>}
              {item.note && <span className="kpi-note">{item.note}</span>}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
