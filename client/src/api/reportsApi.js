import { apiRequest } from './client';

/** Cross-domain summary for Admin and Manager. */
export function fetchReportSummary() {
  return apiRequest('/api/reports/summary', { errorMessage: 'Failed to fetch summary report' });
}
