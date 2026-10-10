import { apiRequest } from './client';

/** Public readiness and build information. */
export function fetchStatus() {
  return apiRequest('/api/status', { auth: false, errorMessage: 'Failed to fetch system status' });
}
