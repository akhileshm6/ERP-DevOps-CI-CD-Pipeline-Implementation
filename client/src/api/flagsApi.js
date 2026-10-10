import { apiRequest } from './client';

export function fetchFlags() {
  return apiRequest('/api/flags', { errorMessage: 'Failed to fetch feature flags' });
}

export function updateFlag(key, update) {
  return apiRequest(`/api/flags/${encodeURIComponent(key)}`, { method: 'PATCH', body: update, errorMessage: 'Failed to update feature flag' });
}

export function evaluateFlags() {
  return apiRequest('/api/flags/evaluate', { errorMessage: 'Failed to evaluate feature flags' });
}
