import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFlags, updateFlag } from '../../api/flagsApi';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '../common/WidgetStates';
import { formatDateTime } from '../../utils/format';

const ROLES = ['Admin', 'Manager', 'Employee'];
const FLAGS_QUERY_KEY = ['flags'];

function clampPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0;
}

export function FeatureFlagConsole() {
  const queryClient = useQueryClient();
  const [rolloutDrafts, setRolloutDrafts] = useState({});
  const [feedback, setFeedback] = useState({});
  const flagsQuery = useQuery({ queryKey: FLAGS_QUERY_KEY, queryFn: fetchFlags });
  const mutation = useMutation({
    mutationFn: ({ key, update }) => updateFlag(key, update),
    onSuccess: (updatedFlag, { key }) => {
      if (updatedFlag?.key) {
        queryClient.setQueryData(FLAGS_QUERY_KEY, (current) => (Array.isArray(current)
          ? current.map((flag) => (flag.key === updatedFlag.key ? updatedFlag : flag))
          : current));
      }
      setFeedback((current) => ({ ...current, [key]: { type: 'success', message: 'Saved' } }));
    },
    onError: (error, { key }) => {
      setFeedback((current) => ({ ...current, [key]: { type: 'error', message: error?.message || 'Update failed' } }));
    },
    onSettled: (data, error, { key }) => {
      setRolloutDrafts(({ [key]: _discarded, ...rest }) => rest);
      queryClient.invalidateQueries({ queryKey: FLAGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['flags', 'evaluate'] });
    }
  });

  const header = (
    <div className="section-header">
      <div>
        <h2 id="feature-flag-title" className="section-title">Feature flags</h2>
        <p className="section-description">Turn features on or off and set rollout by role. Changes apply to this environment.</p>
      </div>
    </div>
  );

  if (flagsQuery.isLoading) return <section className="section" aria-labelledby="feature-flag-title">{header}<WidgetSkeleton label="Loading feature flags" /></section>;
  if (flagsQuery.isError) return <section className="section" aria-labelledby="feature-flag-title">{header}<WidgetError title="Feature flags unavailable" error={flagsQuery.error} onRetry={flagsQuery.refetch} /></section>;

  const flags = Array.isArray(flagsQuery.data) ? flagsQuery.data : [];
  const savingKey = mutation.isPending ? mutation.variables?.key : null;

  const save = (key, update) => {
    setFeedback(({ [key]: _discarded, ...rest }) => rest);
    mutation.mutate({ key, update });
  };

  const commitRollout = (flag) => {
    const draft = rolloutDrafts[flag.key];
    if (draft === undefined || draft === clampPercent(flag.rollout_percent)) return;
    save(flag.key, { rolloutPercent: draft });
  };

  const toggleRole = (flag, role) => {
    const roles = Array.isArray(flag.target_roles) ? flag.target_roles : [];
    const targetRoles = roles.includes(role) ? roles.filter((targetRole) => targetRole !== role) : [...roles, role];
    save(flag.key, { targetRoles });
  };

  return (
    <section className="section" aria-labelledby="feature-flag-title">
      {header}
      <p className="text-secondary num" aria-live="polite">{flags.filter((flag) => flag.enabled).length} of {flags.length} enabled</p>
      {flags.length === 0 ? <WidgetEmpty title="No feature flags" message="No feature flags are configured for this environment." /> : (
        <div className="table-scroll">
          <table className="table table-flags">
            <caption className="visually-hidden">Feature flags</caption>
            <thead><tr><th scope="col">Flag</th><th scope="col">Enabled</th><th scope="col">Rollout</th><th scope="col">Target roles</th><th scope="col">Last updated</th></tr></thead>
            <tbody>
              {flags.map((flag) => {
                const rollout = rolloutDrafts[flag.key] ?? clampPercent(flag.rollout_percent);
                const targetRoles = Array.isArray(flag.target_roles) ? flag.target_roles : [];
                const isSaving = savingKey === flag.key;
                const rowFeedback = feedback[flag.key];
                return (
                  <tr key={flag.key} aria-busy={isSaving}>
                    <td>
                      <div className="mono cell-strong">{flag.key}</div>
                      {flag.description && <div className="cell-sub">{flag.description}</div>}
                      <div className="row-feedback" role={rowFeedback?.type === 'error' ? 'alert' : 'status'}>
                        {isSaving ? 'Saving…' : rowFeedback ? <span className={rowFeedback.type === 'error' ? 'text-danger' : 'text-success'}>{rowFeedback.type === 'error' ? `Not saved: ${rowFeedback.message}` : rowFeedback.message}</span> : null}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(flag.enabled)}
                        aria-label={`Enabled: ${flag.key}`}
                        className="switch"
                        disabled={isSaving}
                        onClick={() => save(flag.key, { enabled: !flag.enabled })}
                      ><span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span><span className="switch-text">{flag.enabled ? 'On' : 'Off'}</span></button>
                    </td>
                    <td>
                      <div className="rollout">
                        <input
                          type="range" min="0" max="100" step="5"
                          value={rollout}
                          disabled={isSaving}
                          aria-label={`Rollout percentage: ${flag.key}`}
                          onChange={(event) => setRolloutDrafts((current) => ({ ...current, [flag.key]: Number(event.target.value) }))}
                          onPointerUp={() => commitRollout(flag)}
                          onKeyUp={() => commitRollout(flag)}
                          onBlur={() => commitRollout(flag)}
                        />
                        <output className="num">{rollout}%</output>
                      </div>
                    </td>
                    <td>
                      <fieldset className="role-checks" disabled={isSaving}>
                        <legend className="visually-hidden">Target roles for {flag.key}</legend>
                        {ROLES.map((role) => (
                          <label key={role}>
                            <input type="checkbox" checked={targetRoles.includes(role)} onChange={() => toggleRole(flag, role)} />
                            {role}
                          </label>
                        ))}
                      </fieldset>
                    </td>
                    <td>
                      <div>{flag.updated_by || '—'}</div>
                      <div className="cell-sub num">{formatDateTime(flag.updated_at)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
