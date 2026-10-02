import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

const base64url = (value) => window.btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Unsigned JWT in the shape the client decodes. */
export function makeToken({ id = 1, role = 'admin', name = 'Test User', exp = Math.floor(Date.now() / 1000) + 3600 } = {}) {
  return `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ id, role, name, exp })}.sig`;
}

export function signIn(claims) {
  const token = makeToken(claims);
  window.localStorage.setItem('token', token);
  return token;
}

export const json = (body, status = 200) => ({ status, body });

/**
 * Mocks global.fetch with a router keyed by "METHOD /path" (query string ignored).
 * A route value is a response ({status, body}), a plain body, a function(req) returning either
 * (or a Promise). Use sequence() for per-call responses.
 */
export function mockFetch(routes = {}) {
  const table = { ...routes };
  const fetchMock = jest.fn(async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const parsed = new URL(url, 'http://localhost');
    const key = `${method} ${parsed.pathname}`;
    let route = table[key];
    if (route === undefined) throw new Error(`Unmocked request: ${key}`);
    const req = { method, path: parsed.pathname, query: Object.fromEntries(parsed.searchParams), headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined };
    let result = typeof route === 'function' ? await route(req) : route;
    if (!result || typeof result.status !== 'number' || !('body' in result)) result = { status: 200, body: result };
    return { ok: result.status >= 200 && result.status < 300, status: result.status, json: async () => result.body };
  });
  fetchMock.routes = table;
  fetchMock.callsTo = (method, path) => fetchMock.mock.calls
    .map(([url, init = {}]) => ({ url, init, parsed: new URL(url, 'http://localhost') }))
    .filter(({ init, parsed }) => (init.method || 'GET').toUpperCase() === method && parsed.pathname === path);
  fetchMock.requestedPaths = () => fetchMock.mock.calls.map(([url]) => new URL(url, 'http://localhost').pathname);
  global.fetch = fetchMock;
  return fetchMock;
}

/** Route that answers with each response in turn; the last one repeats. */
export function sequence(...responses) {
  let index = 0;
  return () => responses[Math.min(index++, responses.length - 1)];
}

/** Pending promise you can resolve later. */
export function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

export function renderApp({ hash } = {}) {
  if (hash) window.location.hash = hash;
  const user = userEvent.setup();
  return { user, ...render(<App />) };
}

// ----- Fixtures -----
export const statusFixture = (overrides = {}) => ({
  ready: true, database: 'connected', environment: 'staging', version: '1.4.0', commitSha: 'abcdef1234567890',
  branch: 'main', builtAt: '2026-10-01T10:00:00Z', dataSource: 'live', store: 'postgres', ...overrides
});

export const salesFixture = (summary = {}, data) => ({
  summary: { totalRevenue: 12345.6, orderCount: 3, averageOrderValue: 4115.2, completedOrders: 2, pendingOrders: 0, refundedOrders: 0, previousPeriodRevenue: null, ...summary },
  data: data ?? [
    { id: 1, clientName: 'Acme Corp', totalAmount: 5000, status: 'Completed', createdAt: '2026-09-20T10:00:00Z' },
    { id: 2, clientName: 'Globex', totalAmount: 7345.6, status: 'Completed', createdAt: '2026-09-21T10:00:00Z' }
  ]
});

export const inventoryFixture = (data) => ({
  asOf: '2026-10-02T09:00:00Z',
  summary: { stockValue: 98765, itemCount: (data || []).length || 2, totalQuantity: 150, lowStockCount: 0 },
  data: data ?? [
    { id: 1, sku: 'SKU-OK-1', name: 'Bolts', category: 'Hardware', quantity: 100, minStockLevel: 10, unitPrice: 1 },
    { id: 2, sku: 'SKU-OK-2', name: 'Nuts', category: 'Hardware', quantity: 50, minStockLevel: 5, unitPrice: 1 }
  ]
});

export const hrFixture = (data) => ({
  summary: { totalEmployees: 2, departmentCount: 1, activeCount: 2, onLeaveCount: 0, newHires: 1, averageSalary: 65000, avgPerformance: 4.2 },
  data: data ?? [
    { id: 1, name: 'Alice Smith', department: 'Engineering', role: 'Engineer', status: 'Active', hireDate: '2025-01-10', salary: 70000 },
    { id: 2, name: 'Bob Jones', department: 'Engineering', role: 'Engineer', status: 'Active', hireDate: '2026-09-10', salary: 60000 }
  ]
});

export const financeFixture = (data) => ({
  summary: { totalRevenue: 50000, totalExpenses: 20000, netProfit: 30000, profitMargin: 60, transactionCount: 2, pendingCount: 0 },
  data: data ?? [
    { id: 1, category: 'Sales', transactionType: 'Income', amount: 50000, status: 'Completed', createdAt: '2026-09-20T10:00:00Z' },
    { id: 2, category: 'Rent', transactionType: 'Expense', amount: 20000, status: 'Completed', createdAt: '2026-09-21T10:00:00Z' }
  ]
});

export const summaryFixture = (overrides = {}) => ({
  generatedAt: '2026-10-02T10:00:00Z', range: '30d',
  sales: { revenue: 12345, orders: 3, pendingOrders: 0, previousPeriodRevenue: null },
  inventory: { itemCount: 2, lowStockCount: 0, stockValue: 98765, lowStockItems: [] },
  hr: { headcount: 2, active: 2, onLeave: 0, newHires: 1 },
  finance: { revenue: 50000, expenses: 20000, netProfit: 30000, pendingCount: 0 },
  deployments: { latest: { version: '1.4.0', status: 'success', environment: 'production', commit_sha: 'abcdef1234567890', started_at: '2026-10-01T10:00:00Z' }, failedLast7d: 0 },
  ...overrides
});

export const deploymentsFixture = () => ({
  data: [
    { id: 1, version: '1.4.0', image_tag: '1.4.0', commit_sha: 'aaaaaaa1111111111111111111111111111111aa', environment: 'production', status: 'success', triggered_by: 'ci', trigger_type: 'push', started_at: '2026-10-01T10:00:00Z', completed_at: '2026-10-01T10:05:00Z', duration_seconds: 300 },
    { id: 2, version: '1.3.9', image_tag: '1.3.9', commit_sha: 'bbbbbbb2222222222222222222222222222222bb', environment: 'production', status: 'failed', triggered_by: 'ci', trigger_type: 'push', started_at: '2026-09-30T10:00:00Z', completed_at: '2026-09-30T10:02:00Z', duration_seconds: 120 },
    { id: 3, version: '1.3.8', image_tag: '1.3.8', commit_sha: 'ccccccc3333333333333333333333333333333cc', environment: 'staging', status: 'rolled_back', triggered_by: 'admin', trigger_type: 'manual', started_at: '2026-09-29T10:00:00Z', completed_at: null, duration_seconds: null }
  ],
  total: 3, page: 1, pages: 1
});

/** Default routes for a signed-in session; override per test. */
export function defaultRoutes(overrides = {}) {
  return {
    'GET /api/status': statusFixture(),
    'GET /api/reports/summary': summaryFixture(),
    'GET /api/metrics/sales': salesFixture(),
    'GET /api/metrics/inventory': inventoryFixture(),
    'GET /api/metrics/hr': hrFixture(),
    'GET /api/metrics/finance': financeFixture(),
    'GET /api/deployments': deploymentsFixture(),
    'GET /api/deployments/current': { version: '1.4.0', environment: 'production', commitSha: 'aaaaaaa111', deployedAt: '2026-10-01T10:05:00Z' },
    'GET /api/flags': [],
    'GET /api/flags/evaluate': { role: 'Admin', environment: 'staging', enabled: ['new-finance-chart'], flags: { 'new-finance-chart': true } },
    ...overrides
  };
}
