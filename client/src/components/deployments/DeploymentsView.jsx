import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentDeployment, fetchDeployments } from '../../api/deploymentsApi';
import { DeploymentHistoryTable } from './DeploymentHistoryTable';
import { WidgetError } from '../common/WidgetStates';
import { formatDateTime, shortSha } from '../../utils/format';

const DEPLOYMENT_FETCH_LIMIT = 50;

function CurrentVersion() {
  const query = useQuery({ queryKey: ['deployments', 'current'], queryFn: fetchCurrentDeployment });
  const current = query.data;
  return (
    <section className="section" aria-labelledby="current-version-title">
      <h2 id="current-version-title" className="section-title">Current version</h2>
      {query.isError ? <WidgetError title="Current version unavailable" error={query.error} onRetry={query.refetch} />
        : (
          <dl className="facts">
            <div><dt>Version</dt><dd className="cell-strong">{query.isLoading ? '…' : current?.version || '—'}</dd></div>
            <div><dt>Environment</dt><dd>{current?.environment || '—'}</dd></div>
            <div><dt>Commit</dt><dd className="mono" title={current?.commitSha}>{shortSha(current?.commitSha) || '—'}</dd></div>
            <div><dt>Deployed</dt><dd className="num">{formatDateTime(current?.deployedAt)}</dd></div>
          </dl>
        )}
    </section>
  );
}

export function DeploymentsView({ userRole }) {
  const deploymentsQuery = useQuery({
    queryKey: ['deployments', 1, DEPLOYMENT_FETCH_LIMIT],
    queryFn: () => fetchDeployments({ page: 1, limit: DEPLOYMENT_FETCH_LIMIT })
  });

  return (
    <>
      <CurrentVersion />
      {deploymentsQuery.isError
        ? <section className="section"><WidgetError title="Deployment history unavailable" error={deploymentsQuery.error} onRetry={deploymentsQuery.refetch} /></section>
        : <DeploymentHistoryTable deployments={deploymentsQuery.data?.data || []} userRole={userRole} isLoading={deploymentsQuery.isLoading} />}
    </>
  );
}
