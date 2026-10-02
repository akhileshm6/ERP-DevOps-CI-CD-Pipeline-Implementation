import { apiRequest } from './client';

export function fetchDeployments({ page = 1, limit = 10 } = {}) {
  return apiRequest(`/api/deployments?page=${page}&limit=${limit}`, { errorMessage: 'Failed to fetch deployments' });
}

export function fetchCurrentDeployment() {
  return apiRequest('/api/deployments/current', { errorMessage: 'Failed to fetch current deployment' });
}
