import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Flag, SlidersHorizontal } from 'lucide-react';
import { fetchFlags, updateFlag } from '../../api/flagsApi';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '../common/WidgetStates';

const ROLES = ['Admin', 'Manager', 'Employee'];
const FLAGS_QUERY_KEY = ['flags'];

function formatFlagName(key) {
  return String(key || '').split(/[-_.]/).filter(Boolean).map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part)).join(' ');
}

function clampPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0;
}

export function FeatureFlagConsole() {
  const queryClient = useQueryClient();
  const [rolloutDrafts, setRolloutDrafts] = useState({});
  const flagsQuery = useQuery({ queryKey: FLAGS_QUERY_KEY, queryFn: fetchFlags });
  const mutation = useMutation({
    mutationFn: ({ key, update }) => updateFlag(key, update),
    onSuccess: (updatedFlag) => {
      if (updatedFlag?.key) {
        queryClient.setQueryData(FLAGS_QUERY_KEY, (current) => (Array.isArray(current)
          ? current.map((flag) => (flag.key === updatedFlag.key ? updatedFlag : flag))
          : current));
      }
    },
    onSettled: (data, error, { key }) => {
      setRolloutDrafts(({ [key]: _discarded, ...rest }) => rest);
      queryClient.invalidateQueries({ queryKey: FLAGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['flags-evaluate'] });
    }
  });

  if (flagsQuery.isLoading) {
    return <section className="feature-flag-console" aria-busy="true"><div style={{ padding: 24 }}><WidgetSkeleton /></div></section>;
  }
  if (flagsQuery.isError) {
    return <section className="feature-flag-console"><WidgetError title="Feature flags unavailable" error={flagsQuery.error} onRetry={() => flagsQuery.refetch()} /></section>;
  }

  const flags = Array.isArray(flagsQuery.data) ? flagsQuery.data : [];
  const enabledCount = flags.filter((flag) => flag.enabled).length;
  const savingKey = mutation.isPending ? mutation.variables?.key : null;

  const save = (key, update) => mutation.mutate({ key, update });

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
    <section className="feature-flag-console" aria-labelledby="feature-flag-title">
      <header className="feature-flag-header">
        <div className="feature-flag-heading">
          <div className="feature-flag-icon"><Flag size={18} aria-hidden="true" /></div>
          <div>
            <h2 id="feature-flag-title">Feature flags</h2>
            <p>Control feature availability and staged rollouts by role.</p>
          </div>
        </div>
        <div className="feature-flag-summary" aria-live="polite">
          <SlidersHorizontal size={15} aria-hidden="true" />
          <span>{enabledCount} of {flags.length} enabled</span>
          <span className="feature-flag-storage">{savingKey ? 'Saving...' : 'Synced with server'}</span>
        </div>
      </header>

      {mutation.isError && <div className="feature-flag-error" role="alert"><AlertCircle size={15} aria-hidden="true" /> {mutation.error?.message || 'Failed to update feature flag.'}</div>}

      {flags.length === 0 ? <WidgetEmpty title="No feature flags" message="No feature flags are configured for this environment." /> : <>
        <div className="feature-flag-columns" aria-hidden="true">
          <span>Feature</span><span>Rollout</span><span>Target roles</span><span>Enabled</span>
        </div>
        <div className="feature-flag-list" role="list">
          {flags.map((flag) => {
            const name = formatFlagName(flag.key);
            const rollout = rolloutDrafts[flag.key] ?? clampPercent(flag.rollout_percent);
            const targetRoles = Array.isArray(flag.target_roles) ? flag.target_roles : [];
            const isSaving = savingKey === flag.key;
            return (
              <article className={`feature-flag-row ${isSaving ? 'is-saving' : ''}`} key={flag.key} role="listitem" aria-busy={isSaving}>
                <div className="feature-flag-identity">
                  <h3>{name}</h3>
                  <p>{flag.description}</p>
                  <code>{flag.key}</code>
                </div>

                <label className="feature-flag-rollout">
                  <span>Rollout</span>
                  <div className="feature-flag-slider-row">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={rollout}
                      disabled={isSaving}
                      aria-label={`Rollout percentage for ${name}`}
                      onChange={(event) => setRolloutDrafts((current) => ({ ...current, [flag.key]: Number(event.target.value) }))}
                      onPointerUp={() => commitRollout(flag)}
                      onKeyUp={() => commitRollout(flag)}
                      onBlur={() => commitRollout(flag)}
                    />
                    <output>{rollout}%</output>
                  </div>
                </label>

                <fieldset className="feature-flag-targets" disabled={isSaving}>
                  <legend>Target roles</legend>
                  {ROLES.map((role) => (
                    <label key={role}>
                      <input type="checkbox" checked={targetRoles.includes(role)} onChange={() => toggleRole(flag, role)} />
                      <span>{role === 'Employee' ? 'User' : role}</span>
                    </label>
                  ))}
                </fieldset>

                <div className="feature-flag-enabled">
                  <span>{flag.enabled ? 'On' : 'Off'}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(flag.enabled)}
                    aria-label={`${flag.enabled ? 'Disable' : 'Enable'} ${name}`}
                    className={`feature-flag-switch ${flag.enabled ? 'is-enabled' : ''}`}
                    disabled={isSaving}
                    onClick={() => save(flag.key, { enabled: !flag.enabled })}
                  ><span /></button>
                </div>
              </article>
            );
          })}
        </div>
      </>}
    </section>
  );
}
