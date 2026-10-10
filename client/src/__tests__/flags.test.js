import { screen, waitFor, within } from '@testing-library/react';
import { defaultRoutes, json, mockFetch, renderApp, signIn } from '../test-utils';

const flagRows = () => [
  { key: 'new-dashboard', description: 'Redesigned dashboard', enabled: true, rollout_percent: 50, target_roles: ['Admin'], environment: 'staging', updated_by: 'admin@erp.local', updated_at: '2026-10-01T10:00:00Z' },
  { key: 'beta-reports', description: 'Beta reports', enabled: false, rollout_percent: 0, target_roles: [], environment: 'staging', updated_by: null, updated_at: null }
];

/** Small in-memory flags API so the refetch after a save sees the change. */
function flagsApi({ failPatch = false } = {}) {
  let rows = flagRows();
  return {
    'GET /api/flags': () => rows,
    'PATCH /api/flags/new-dashboard': (req) => {
      if (failPatch) return json({ error: 'Database unavailable' }, 500);
      rows = rows.map((row) => (row.key === 'new-dashboard' ? { ...row, ...req.body, updated_by: 'admin@erp.local' } : row));
      return rows.find((row) => row.key === 'new-dashboard');
    }
  };
}

const rowFor = (key) => screen.getByText(key, { selector: 'div' }).closest('tr');

beforeEach(() => signIn({ role: 'admin', name: 'Ada Admin' }));

test('renders the flag list', async () => {
  mockFetch(defaultRoutes(flagsApi()));
  renderApp({ hash: '#flags' });
  expect(await screen.findByRole('table', { name: 'Feature flags' })).toBeInTheDocument();
  expect(screen.getByText('1 of 2 enabled')).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Enabled: new-dashboard' })).toBeChecked();
  expect(screen.getByRole('switch', { name: 'Enabled: beta-reports' })).not.toBeChecked();
  expect(screen.getByText('Redesigned dashboard')).toBeInTheDocument();
});

test('toggling a flag sends PATCH with enabled:false and shows success', async () => {
  const fetchMock = mockFetch(defaultRoutes(flagsApi()));
  const { user } = renderApp({ hash: '#flags' });
  await user.click(await screen.findByRole('switch', { name: 'Enabled: new-dashboard' }));

  const row = rowFor('new-dashboard');
  expect(await within(row).findByText('Saved')).toBeInTheDocument();
  const patches = fetchMock.callsTo('PATCH', '/api/flags/new-dashboard');
  expect(patches).toHaveLength(1);
  expect(JSON.parse(patches[0].init.body)).toEqual({ enabled: false });
  expect(patches[0].init.headers.Authorization).toMatch(/^Bearer /);
  await waitFor(() => expect(screen.getByRole('switch', { name: 'Enabled: new-dashboard' })).not.toBeChecked());
  expect(screen.getByText('0 of 2 enabled')).toBeInTheDocument();
});

test('a failed PATCH shows an error on that row and does not claim success', async () => {
  mockFetch(defaultRoutes(flagsApi({ failPatch: true })));
  const { user } = renderApp({ hash: '#flags' });
  await user.click(await screen.findByRole('switch', { name: 'Enabled: new-dashboard' }));

  const row = rowFor('new-dashboard');
  expect(await within(row).findByRole('alert')).toHaveTextContent('Not saved: Database unavailable');
  expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  expect(within(rowFor('beta-reports')).queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Enabled: new-dashboard' })).toBeChecked();
  expect(window.localStorage.getItem('token')).not.toBeNull();
});
