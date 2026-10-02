import React, { useEffect, useState } from 'react';
import { Flag, SlidersHorizontal } from 'lucide-react';

const STORAGE_KEY = 'erp-feature-flags';
const ROLES = ['Admin', 'Manager', 'Employee'];
const DEFAULT_FLAGS = [
  {
    id: 'sales-insights',
    name: 'Sales insights',
    description: 'Expanded sales trends and order analysis.',
    enabled: true,
    rollout: 100,
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    id: 'inventory-forecasting',
    name: 'Inventory forecasting',
    description: 'Demand forecasts for stock planning.',
    enabled: false,
    rollout: 25,
    roles: ['Admin', 'Manager']
  },
  {
    id: 'finance-anomaly-alerts',
    name: 'Finance anomaly alerts',
    description: 'Early warnings for unusual financial activity.',
    enabled: true,
    rollout: 50,
    roles: ['Admin']
  }
];

function loadFlags() {
  try {
    const savedFlags = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(savedFlags)) return DEFAULT_FLAGS;

    return DEFAULT_FLAGS.map((defaultFlag) => {
      const savedFlag = savedFlags.find((flag) => flag.id === defaultFlag.id);
      if (!savedFlag) return defaultFlag;

      return {
        ...defaultFlag,
        enabled: typeof savedFlag.enabled === 'boolean' ? savedFlag.enabled : defaultFlag.enabled,
        rollout: Number.isFinite(savedFlag.rollout) ? Math.min(100, Math.max(0, savedFlag.rollout)) : defaultFlag.rollout,
        roles: Array.isArray(savedFlag.roles) ? ROLES.filter((role) => savedFlag.roles.includes(role)) : defaultFlag.roles
      };
    });
  } catch {
    return DEFAULT_FLAGS;
  }
}

export function FeatureFlagConsole() {
  const [flags, setFlags] = useState(loadFlags);
  const enabledCount = flags.filter((flag) => flag.enabled).length;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch {
      return;
    }
  }, [flags]);

  const updateFlag = (flagId, update) => {
    setFlags((currentFlags) => currentFlags.map((flag) => (
      flag.id === flagId ? { ...flag, ...update } : flag
    )));
  };

  const toggleRole = (flag, role) => {
    const roles = flag.roles.includes(role)
      ? flag.roles.filter((targetRole) => targetRole !== role)
      : [...flag.roles, role];
    updateFlag(flag.id, { roles });
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
          <span className="feature-flag-storage">Saved in this browser</span>
        </div>
      </header>

      <div className="feature-flag-columns" aria-hidden="true">
        <span>Feature</span><span>Rollout</span><span>Target roles</span><span>Enabled</span>
      </div>
      <div className="feature-flag-list" role="list">
        {flags.map((flag) => (
          <article className="feature-flag-row" key={flag.id} role="listitem">
            <div className="feature-flag-identity">
              <h3>{flag.name}</h3>
              <p>{flag.description}</p>
              <code>{flag.id}</code>
            </div>

            <label className="feature-flag-rollout">
              <span>Rollout</span>
              <div className="feature-flag-slider-row">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={flag.rollout}
                  aria-label={`Rollout percentage for ${flag.name}`}
                  onChange={(event) => updateFlag(flag.id, { rollout: Number(event.target.value) })}
                />
                <output>{flag.rollout}%</output>
              </div>
            </label>

            <fieldset className="feature-flag-targets">
              <legend>Target roles</legend>
              {ROLES.map((role) => (
                <label key={role}>
                  <input
                    type="checkbox"
                    checked={flag.roles.includes(role)}
                    onChange={() => toggleRole(flag, role)}
                  />
                  <span>{role === 'Employee' ? 'User' : role}</span>
                </label>
              ))}
            </fieldset>

            <div className="feature-flag-enabled">
              <span>{flag.enabled ? 'On' : 'Off'}</span>
              <button
                type="button"
                role="switch"
                aria-checked={flag.enabled}
                aria-label={`${flag.enabled ? 'Disable' : 'Enable'} ${flag.name}`}
                className={`feature-flag-switch ${flag.enabled ? 'is-enabled' : ''}`}
                onClick={() => updateFlag(flag.id, { enabled: !flag.enabled })}
              ><span /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}