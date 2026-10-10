import { screen, waitFor, within } from '@testing-library/react';
import { defaultRoutes, mockFetch, renderApp, signIn } from '../test-utils';

const tabLabels = async () => {
  const nav = await screen.findByRole('navigation', { name: 'Primary' });
  return within(nav).getAllByRole('link').map((link) => link.textContent);
};

test('an Employee sees Overview, Sales and Inventory only and never requests restricted data', async () => {
  signIn({ role: 'user', name: 'Eve Employee' });
  const fetchMock = mockFetch(defaultRoutes());
  const { user } = renderApp();

  expect(await tabLabels()).toEqual(['Overview', 'Sales', 'Inventory']);
  expect(within(screen.getByRole('banner')).getByText('Employee')).toBeInTheDocument();
  await screen.findAllByText('$12,346');

  await user.click(screen.getByRole('link', { name: 'Sales' }));
  await screen.findByRole('heading', { name: 'Sales', level: 2 });
  await user.click(screen.getByRole('link', { name: 'Inventory' }));
  await screen.findByRole('heading', { name: 'Inventory', level: 2 });

  // A restricted hash falls back to Overview.
  window.location.hash = '#finance';
  await screen.findByRole('heading', { name: 'Needs attention' });

  const paths = fetchMock.requestedPaths();
  expect(paths).toContain('/api/metrics/sales');
  expect(paths).toContain('/api/metrics/inventory');
  expect(paths).not.toContain('/api/metrics/hr');
  expect(paths).not.toContain('/api/metrics/finance');
  expect(paths).not.toContain('/api/reports/summary');
  expect(paths).not.toContain('/api/flags');
  expect(paths).not.toContain('/api/deployments');
});

test('a Manager has People, Finance and Deployments but no Feature flags', async () => {
  signIn({ role: 'manager' });
  mockFetch(defaultRoutes());
  renderApp();
  expect(await tabLabels()).toEqual(['Overview', 'Sales', 'Inventory', 'People', 'Finance', 'Deployments']);
});

test('an Admin has every tab', async () => {
  signIn({ role: 'admin' });
  mockFetch(defaultRoutes());
  renderApp();
  expect(await tabLabels()).toEqual(['Overview', 'Sales', 'Inventory', 'People', 'Finance', 'Deployments', 'Feature flags']);
});

test('the #sales hash opens the Sales tab', async () => {
  signIn({ role: 'admin' });
  mockFetch(defaultRoutes());
  renderApp({ hash: '#sales' });
  expect(await screen.findByRole('heading', { name: 'Sales', level: 2 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Sales' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('main')).toHaveAccessibleName('Sales');
  await waitFor(() => expect(document.title).toBe('Sales · SP301 ERP'));
});
