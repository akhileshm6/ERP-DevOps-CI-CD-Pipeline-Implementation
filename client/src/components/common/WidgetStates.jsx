import React from 'react';

export function Spinner({ label }) {
  return <span className="spinner" role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'} />;
}

export function WidgetSkeleton({ label = 'Loading' }) {
  return (
    <div className="widget-state" role="status" aria-live="polite">
      <Spinner /> <span>{label}…</span>
    </div>
  );
}

export function WidgetError({ error, onRetry, title = 'Data unavailable' }) {
  return (
    <div className="widget-state widget-state-error" role="alert">
      <div>
        <p className="widget-state-title">{title}</p>
        <p className="widget-state-message">{error?.message || 'The request failed. Other sections are unaffected.'}</p>
      </div>
      {onRetry && <button type="button" className="btn" onClick={() => onRetry()}>Retry</button>}
    </div>
  );
}

export function WidgetEmpty({ title = 'No data', message = 'No records for the selected period.' }) {
  return (
    <div className="widget-state">
      <div>
        <p className="widget-state-title">{title}</p>
        <p className="widget-state-message">{message}</p>
      </div>
    </div>
  );
}
