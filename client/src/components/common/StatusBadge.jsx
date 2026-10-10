import React from 'react';

/** Status text with a semantic tone. The label always carries the meaning; colour only reinforces it. */
export function StatusBadge({ tone = 'neutral', children, title }) {
  return <span className={`badge badge-${tone}`} title={title}><span className="badge-dot" aria-hidden="true" />{children}</span>;
}

const SALES_TONES = { completed: 'success', pending: 'warning', refunded: 'neutral' };
export const salesStatusTone = (status) => SALES_TONES[String(status || '').toLowerCase()] || 'neutral';

const DEPLOYMENT_STATUS = {
  success: { label: 'Succeeded', tone: 'success' },
  succeeded: { label: 'Succeeded', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  rolled_back: { label: 'Rolled back', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'neutral' },
  pending: { label: 'Pending', tone: 'neutral' }
};
export function deploymentStatus(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return DEPLOYMENT_STATUS[key] || { label: value || 'Unknown', tone: 'neutral' };
}

export function DeploymentStatusBadge({ status }) {
  const { label, tone } = deploymentStatus(status);
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
