import React from 'react';
import { RefreshCw } from 'lucide-react';

export function SectionHeader({ id, title, description, children, onRefresh, isFetching }) {
  return (
    <div className="section-header">
      <div>
        <h2 id={id} className="section-title">{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      <div className="section-actions">
        {children}
        {onRefresh && (
          <button type="button" className="btn btn-icon" onClick={() => onRefresh()} disabled={isFetching} aria-label={`Refresh ${title.toLowerCase()} data`} title="Refresh">
            <RefreshCw size={14} aria-hidden="true" className={isFetching ? 'spin' : ''} />
          </button>
        )}
      </div>
    </div>
  );
}
