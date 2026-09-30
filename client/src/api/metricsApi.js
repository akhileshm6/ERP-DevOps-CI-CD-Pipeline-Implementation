const API_BASE = process.env.REACT_APP_API_URL || '';

export async function fetchSalesMetrics(range = '30d') {
  const res = await fetch(`${API_BASE}/api/metrics/sales?range=${encodeURIComponent(range)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch sales metrics (${res.status})`);
  }
  return res.json();
}

export async function fetchInventoryMetrics(range = '30d') {
  const res = await fetch(`${API_BASE}/api/metrics/inventory?range=${encodeURIComponent(range)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch inventory metrics (${res.status})`);
  }
  return res.json();
}

export async function fetchHrMetrics(range = '30d') {
  const res = await fetch(`${API_BASE}/api/metrics/hr?range=${encodeURIComponent(range)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch HR metrics (${res.status})`);
  }
  return res.json();
}

export async function fetchFinanceMetrics(range = '30d') {
  const res = await fetch(`${API_BASE}/api/metrics/finance?range=${encodeURIComponent(range)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch finance metrics (${res.status})`);
  }
  return res.json();
}

export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE}/api/metrics`);
  if (!res.ok) {
    return { status: 'DEGRADED', uptime: 'N/A' };
  }
  return res.json();
}
