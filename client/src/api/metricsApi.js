import { apiRequest } from './client';

const metricsPath = (domain, range) => `/api/metrics/${domain}?range=${encodeURIComponent(range)}`;

export function fetchSalesMetrics(range = '30d') {
  return apiRequest(metricsPath('sales', range), { errorMessage: 'Failed to fetch sales metrics' });
}

export function fetchInventoryMetrics(range = '30d') {
  return apiRequest(metricsPath('inventory', range), { errorMessage: 'Failed to fetch inventory metrics' });
}

export function fetchHrMetrics(range = '30d') {
  return apiRequest(metricsPath('hr', range), { errorMessage: 'Failed to fetch HR metrics' });
}

export function fetchFinanceMetrics(range = '30d') {
  return apiRequest(metricsPath('finance', range), { errorMessage: 'Failed to fetch finance metrics' });
}

export async function fetchSystemStatus() {
  try {
    return await apiRequest('/api/metrics', { errorMessage: 'Failed to fetch system status' });
  } catch {
    return { status: 'DEGRADED', uptime: 'N/A' };
  }
}
