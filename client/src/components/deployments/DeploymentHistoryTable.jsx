import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ExternalLink, History, LoaderCircle, RotateCcw } from 'lucide-react';

const DEFAULT_PAGE_SIZE = 5;

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Shows deployment records supplied by the caller. The caller owns rollback execution,
 * allowing this component to be used with any CI/CD provider or API.
 */
export function DeploymentHistoryTable({
  deployments = [],
  userRole = '',
  onRollback,
  pageSize = DEFAULT_PAGE_SIZE,
  isLoading = false,
  className = ''
}) {
  const [environment, setEnvironment] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState({ key: 'deployedAt', direction: 'desc' });
  const [page, setPage] = useState(1);
  const isAdmin = normalise(userRole) === 'admin';

  const environments = useMemo(() => [...new Set(deployments.map((item) => item.environment).filter(Boolean))], [deployments]);
  const statuses = useMemo(() => [...new Set(deployments.map((item) => item.status).filter(Boolean))], [deployments]);
  const filteredDeployments = useMemo(() => deployments.filter((deployment) => (
    (environment === 'all' || deployment.environment === environment) &&
    (status === 'all' || deployment.status === status)
  )), [deployments, environment, status]);
  const sortedDeployments = useMemo(() => filteredDeployments
    .map((deployment, index) => ({ deployment, index }))
    .sort((left, right) => {
      const leftValue = left.deployment[sort.key] || '';
      const rightValue = right.deployment[sort.key] || '';
      const comparison = sort.key === 'deployedAt'
        ? new Date(leftValue).getTime() - new Date(rightValue).getTime()
        : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' });
      return (Number.isNaN(comparison) ? 0 : comparison) * (sort.direction === 'asc' ? 1 : -1) || left.index - right.index;
    })
    .map(({ deployment }) => deployment), [filteredDeployments, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedDeployments.length / pageSize));
  const pageItems = sortedDeployments.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [environment, status, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const requestSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
    setPage(1);
  };

  const sortHeader = (label, key) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="deployment-sort-button" onClick={() => requestSort(key)}>
        {label}
        {sort.key === key
          ? sort.direction === 'asc' ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />
          : <ArrowDown size={13} aria-hidden="true" className="deployment-sort-inactive" />}
      </button>
    </th>
  );

  return (
    <section className={`deployment-history ${className}`} aria-labelledby="deployment-history-title" aria-busy={isLoading}>
      <div className="deployment-history-header">
        <div>
          <h2 id="deployment-history-title">Deployment history</h2>
          <p>Recent releases across every environment.</p>
        </div>
        <div className="deployment-filters">
          <label>Environment<select value={environment} onChange={(event) => setEnvironment(event.target.value)} aria-label="Filter deployments by environment"><option value="all">All environments</option>{environments.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter deployments by status"><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
      </div>
      <div className="deployment-table-scroll">
        <table className="deployment-table">
          <thead><tr>{sortHeader('Version', 'version')}{sortHeader('Environment', 'environment')}{sortHeader('Status', 'status')}{sortHeader('Deployed', 'deployedAt')}<th scope="col">Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan="5" className="deployment-empty" role="status"><LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> Loading deployment history...</td></tr>}
            {!isLoading && pageItems.map((deployment) => {
              const statusClass = normalise(deployment.status).replace(/\s+/g, '-');
              const logsUrl = deployment.logsUrl || `/deployments/${encodeURIComponent(deployment.id)}/logs`;
              return <tr key={deployment.id || `${deployment.version}-${deployment.deployedAt}`}>
                <td data-label="Version"><span className="deployment-version">{deployment.version || '—'}</span></td>
                <td data-label="Environment">{deployment.environment || '—'}</td>
                <td data-label="Status"><span className={`deployment-status deployment-status-${statusClass}`}>{deployment.status || 'Unknown'}</span></td>
                <td data-label="Deployed">{formatDate(deployment.deployedAt)}</td>
                <td data-label="Actions"><div className="deployment-actions"><a href={logsUrl} target="_blank" rel="noreferrer">View logs <ExternalLink size={13} /></a>{isAdmin && <button type="button" className="rollback-button" onClick={() => onRollback?.(deployment)} disabled={!onRollback || normalise(deployment.status) === 'rolled back'} title={!onRollback ? 'Rollback handler is not configured' : undefined}><RotateCcw size={13} /> Rollback</button>}</div></td>
              </tr>;
            })}
            {!isLoading && pageItems.length === 0 && <tr><td colSpan="5" className="deployment-empty">
              <div className="deployment-empty-content">
                <History size={20} aria-hidden="true" />
                <strong>{deployments.length === 0 ? 'No deployments yet' : 'No deployments match these filters'}</strong>
                <span>{deployments.length === 0 ? 'New releases will appear here.' : 'Try adjusting the environment or status filters.'}</span>
                {deployments.length > 0 && (environment !== 'all' || status !== 'all') && <button type="button" onClick={() => { setEnvironment('all'); setStatus('all'); }}>Clear filters</button>}
              </div>
            </td></tr>}
          </tbody>
        </table>
      </div>
      <div className="deployment-pagination">
        <span>{isLoading ? 'Loading deployments...' : sortedDeployments.length === 0 ? 'No deployments' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, sortedDeployments.length)} of ${sortedDeployments.length}`}</span>
        <div><button type="button" aria-label="Previous deployment page" onClick={() => setPage((current) => current - 1)} disabled={isLoading || page === 1}><ChevronLeft size={16} /></button><span>Page {page} of {totalPages}</span><button type="button" aria-label="Next deployment page" onClick={() => setPage((current) => current + 1)} disabled={isLoading || page === totalPages}><ChevronRight size={16} /></button></div>
      </div>
    </section>
  );
}
