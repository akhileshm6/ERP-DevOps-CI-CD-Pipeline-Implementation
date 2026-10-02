import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';

export function WidgetSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="kpi-row">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <div className="skeleton skeleton-chart" />
    </div>
  );
}

export function WidgetError({ error, onRetry, title = 'Widget Data Unavailable' }) {
  return (
    <div className="widget-state-card widget-error-card">
      <div className="widget-error-icon">
        <AlertCircle size={24} />
      </div>
      <div className="widget-error-title">{title}</div>
      <div className="widget-error-message">
        {error?.message || 'An error occurred while fetching metrics for this domain. Other modules continue running normally.'}
      </div>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry} style={{ marginTop: '6px' }}>
          <RefreshCw size={14} /> Retry Query
        </button>
      )}
    </div>
  );
}

export function WidgetEmpty({ title = 'No Data Available', message = 'No metric entries found for the selected time range.' }) {
  return (
    <div className="widget-state-card">
      <div className="widget-empty-icon">
        <Inbox size={24} />
      </div>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 300 }}>
        {message}
      </div>
    </div>
  );
}
