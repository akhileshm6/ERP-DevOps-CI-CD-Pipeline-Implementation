import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, ExternalLink } from 'lucide-react';
import { DeploymentStatusBadge, deploymentStatus } from '../common/StatusBadge';
import { Spinner } from '../common/WidgetStates';
import { formatDateTime, shortSha } from '../../utils/format';

const DEFAULT_PAGE_SIZE = 10;
export const ROLLBACK_WORKFLOW_URL = 'https://github.com/akhileshm6/ERP-DevOps-CI-CD-Pipeline-Implementation/actions/workflows/rollback.yml';
const NOT_ROLLBACKABLE = ['Rolled back', 'In progress', 'Pending'];

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return '';
  const total = Math.round(Number(seconds));
  return total >= 60 ? `${Math.floor(total / 60)}m ${total % 60}s` : `${total}s`;
}

function CopyButton({ value, label }) {
  const [state, setState] = useState('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
  };
  return (
    <>
      <button type="button" className="btn btn-icon" onClick={copy} aria-label={label} title={label}><Copy size={14} aria-hidden="true" /></button>
      <span className="copy-feedback" role="status">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed, select the text instead' : ''}</span>
    </>
  );
}

function RollbackPanel({ deployment, id, onClose }) {
  const sha = deployment.commit_sha;
  return (
    <div className="rollback-panel" id={id} role="region" aria-label={`Roll back ${deployment.version || 'deployment'}`}>
      <p>
        Rollback is not automatic. It is done by running the <strong>Rollback</strong> GitHub Actions workflow by hand
        with this deployment's commit SHA{deployment.environment ? <> and the <strong>{deployment.environment}</strong> environment</> : null}.
      </p>
      {sha ? (
        <div className="rollback-sha">
          <span className="field-label">Commit SHA</span>
          <code className="mono">{sha}</code>
          <CopyButton value={sha} label="Copy commit SHA" />
        </div>
      ) : <p className="text-secondary">This record has no commit SHA, so it cannot be used as a rollback target.</p>}
      <div className="rollback-actions">
        <a className="btn btn-primary" href={ROLLBACK_WORKFLOW_URL} target="_blank" rel="noreferrer">
          Open Rollback workflow <ExternalLink size={14} aria-hidden="true" /><span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        <button type="button" className="btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/** Deployment records (GET /api/deployments rows) with filters, sorting and paging. */
export function DeploymentHistoryTable({ deployments = [], userRole = '', pageSize = DEFAULT_PAGE_SIZE, isLoading = false }) {
  const [environment, setEnvironment] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState({ key: 'started_at', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [rollbackId, setRollbackId] = useState(null);
  const isAdmin = normalise(userRole) === 'admin';

  const environments = useMemo(() => [...new Set(deployments.map((item) => item.environment).filter(Boolean))], [deployments]);
  const statuses = useMemo(() => [...new Set(deployments.map((item) => item.status).filter(Boolean))], [deployments]);
  const sortedDeployments = useMemo(() => deployments
    .filter((deployment) => (environment === 'all' || deployment.environment === environment) && (status === 'all' || deployment.status === status))
    .map((deployment, index) => ({ deployment, index }))
    .sort((left, right) => {
      const leftValue = left.deployment[sort.key] || '';
      const rightValue = right.deployment[sort.key] || '';
      const comparison = sort.key === 'started_at'
        ? new Date(leftValue).getTime() - new Date(rightValue).getTime()
        : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' });
      return (Number.isNaN(comparison) ? 0 : comparison) * (sort.direction === 'asc' ? 1 : -1) || left.index - right.index;
    })
    .map(({ deployment }) => deployment), [deployments, environment, status, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedDeployments.length / pageSize));
  const pageItems = sortedDeployments.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [environment, status, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const requestSort = (key) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
  };

  const sortHeader = (label, key) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-button" onClick={() => requestSort(key)}>
        {label}
        {sort.key === key && (sort.direction === 'asc' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
      </button>
    </th>
  );

  const columnCount = 6;

  return (
    <section className="section" aria-labelledby="deployment-history-title" aria-busy={isLoading}>
      <div className="section-header">
        <div>
          <h2 id="deployment-history-title" className="section-title">Deployment history</h2>
          <p className="section-description">Releases recorded by the CI/CD pipeline, across environments.</p>
        </div>
        <div className="section-actions">
          <label className="inline-field">Environment
            <select className="select" value={environment} onChange={(event) => setEnvironment(event.target.value)}>
              <option value="all">All</option>
              {environments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="inline-field">Status
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All</option>
              {statuses.map((item) => <option key={item} value={item}>{deploymentStatus(item).label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="table-scroll">
        <table className="table">
          <caption className="visually-hidden">Deployment history</caption>
          <thead><tr>{sortHeader('Version', 'version')}{sortHeader('Environment', 'environment')}{sortHeader('Status', 'status')}{sortHeader('Deployed', 'started_at')}<th scope="col">Triggered by</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={columnCount} className="table-empty" role="status"><Spinner /> Loading deployment history…</td></tr>}
            {!isLoading && pageItems.map((deployment) => {
              const rowId = deployment.id ?? `${deployment.version}-${deployment.started_at}`;
              const duration = formatDuration(deployment.duration_seconds);
              const isOpen = rollbackId === rowId;
              const panelId = `rollback-panel-${rowId}`;
              const canRollBack = !NOT_ROLLBACKABLE.includes(deploymentStatus(deployment.status).label);
              return (
                <Fragment key={rowId}>
                  <tr>
                    <td><span className="cell-strong">{deployment.version || '—'}</span>{deployment.commit_sha && <div className="cell-sub mono" title={deployment.commit_sha}>{shortSha(deployment.commit_sha)}</div>}</td>
                    <td>{deployment.environment || '—'}</td>
                    <td><DeploymentStatusBadge status={deployment.status} /></td>
                    <td><span className="num">{formatDateTime(deployment.completed_at || deployment.started_at)}</span>{duration && <div className="cell-sub num">{duration}</div>}</td>
                    <td>{deployment.triggered_by || '—'}{deployment.trigger_type && <div className="cell-sub">{deployment.trigger_type}</div>}</td>
                    <td>
                      <div className="row-actions">
                        {deployment.logsUrl && <a href={deployment.logsUrl} target="_blank" rel="noreferrer">Logs<span className="visually-hidden"> for {deployment.version} (opens in a new tab)</span></a>}
                        {isAdmin && canRollBack && (
                          <button type="button" className="btn btn-small" aria-expanded={isOpen} aria-controls={isOpen ? panelId : undefined} onClick={() => setRollbackId(isOpen ? null : rowId)}>
                            Roll back…<span className="visually-hidden"> {deployment.version}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && <tr className="row-expansion"><td colSpan={columnCount}><RollbackPanel deployment={deployment} id={panelId} onClose={() => setRollbackId(null)} /></td></tr>}
                </Fragment>
              );
            })}
            {!isLoading && pageItems.length === 0 && (
              <tr><td colSpan={columnCount} className="table-empty">
                {deployments.length === 0 ? 'No deployments recorded yet.' : 'No deployments match these filters.'}
                {deployments.length > 0 && (environment !== 'all' || status !== 'all') && <> <button type="button" className="btn btn-link" onClick={() => { setEnvironment('all'); setStatus('all'); }}>Clear filters</button></>}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span className="num">{isLoading ? 'Loading…' : sortedDeployments.length === 0 ? 'No deployments' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, sortedDeployments.length)} of ${sortedDeployments.length}`}</span>
        <div className="pager">
          <button type="button" className="btn btn-icon" aria-label="Previous page" onClick={() => setPage((current) => current - 1)} disabled={isLoading || page === 1}><ChevronLeft size={16} aria-hidden="true" /></button>
          <span className="num">Page {page} of {totalPages}</span>
          <button type="button" className="btn btn-icon" aria-label="Next page" onClick={() => setPage((current) => current + 1)} disabled={isLoading || page === totalPages}><ChevronRight size={16} aria-hidden="true" /></button>
        </div>
      </div>
    </section>
  );
}
