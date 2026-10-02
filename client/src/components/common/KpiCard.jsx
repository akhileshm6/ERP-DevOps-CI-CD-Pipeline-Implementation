import React from 'react';

export function KpiCard({
  title,
  value,
  subtitle,
  badgeText,
  badgeType = 'positive', // 'positive' | 'warning' | 'alert' | 'neutral'
  icon: Icon
}) {
  const badgeClass =
    badgeType === 'positive'
      ? 'kpi-badge-positive'
      : badgeType === 'warning'
      ? 'kpi-badge-warning'
      : badgeType === 'alert'
      ? 'kpi-badge-alert'
      : 'kpi-badge-neutral';

  return (
    <div className="kpi-card">
      <div className="kpi-label">
        <span>{title}</span>
        {Icon && <Icon size={14} style={{ opacity: 0.6 }} />}
      </div>
      <div className="kpi-value">{value}</div>
      {(subtitle || badgeText) && (
        <div className="kpi-meta">
          {badgeText && <span className={badgeClass}>{badgeText}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
