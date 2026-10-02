import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { formatVersion, roleLabel, shortSha } from '../../utils/format';

export const DEMO_DATA_TITLE = 'Figures are generated sample data seeded on first start';

export function SystemStatusIndicator({ statusQuery }) {
  if (statusQuery.isLoading) return <StatusBadge tone="neutral">Checking status</StatusBadge>;
  const ready = !statusQuery.isError && statusQuery.data?.ready === true;
  return ready
    ? <StatusBadge tone="success" title="GET /api/status reports ready">Operational</StatusBadge>
    : <StatusBadge tone="warning" title={statusQuery.isError ? 'Status check failed' : `Database: ${statusQuery.data?.database || 'unknown'}`}>Degraded</StatusBadge>;
}

export function AppHeader({ session, statusQuery, onLogout }) {
  const status = statusQuery.data;
  return (
    <header className="app-header">
      <div className="app-header-left">
        <span className="product-name">SP301 ERP</span>
        {status?.environment && <span className="header-meta" title="Environment">{status.environment}</span>}
        {status?.version && <span className="header-meta mono" title={status.commitSha || undefined}>{formatVersion(status.version)}{status.commitSha ? ` · ${shortSha(status.commitSha)}` : ''}</span>}
      </div>
      <div className="app-header-right">
        <SystemStatusIndicator statusQuery={statusQuery} />
        {status?.dataSource === 'demo' && <span className="demo-label" title={DEMO_DATA_TITLE}>Demo data</span>}
        <span className="header-user"><span className="header-user-name">{session.name || 'Signed in'}</span><span className="text-secondary" aria-hidden="true"> · </span><span className="text-secondary">{roleLabel(session.role)}</span></span>
        <button type="button" className="btn btn-small" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}
