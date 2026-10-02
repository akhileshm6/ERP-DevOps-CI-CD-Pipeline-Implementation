import { screen, within } from '@testing-library/react';
import { defaultRoutes, inventoryFixture, mockFetch, renderApp, salesFixture, signIn, summaryFixture } from '../test-utils';

const attentionList = async () => {
  const region = await screen.findByRole('region', { name: 'Needs attention' });
  await within(region).findAllByRole('list');
  return region;
};

const lowStockInventory = inventoryFixture([
  { id: 1, sku: 'SKU-LOW-1', name: 'Gaskets', category: 'Parts', quantity: 2, minStockLevel: 10 },
  { id: 2, sku: 'SKU-OK-1', name: 'Bolts', category: 'Hardware', quantity: 100, minStockLevel: 10 }
]);

test('shows low-stock items and pending orders from the data (Employee)', async () => {
  signIn({ role: 'user' });
  mockFetch(defaultRoutes({
    'GET /api/metrics/inventory': lowStockInventory,
    'GET /api/metrics/sales': salesFixture({ pendingOrders: 3 })
  }));
  renderApp();
  const region = await attentionList();
  expect(within(region).getByText('1 item is at or below reorder level')).toBeInTheDocument();
  expect(within(region).getByText('SKU-LOW-1')).toBeInTheDocument();
  expect(within(region).getByText(/Gaskets/)).toBeInTheDocument();
  expect(within(region).queryByText(/Bolts/)).not.toBeInTheDocument();
  expect(within(region).getByText('3 sales orders are pending')).toBeInTheDocument();
  expect(within(region).getByRole('link', { name: 'View inventory' })).toHaveAttribute('href', '#inventory');
  expect(within(region).queryByText(/Nothing needs attention/)).not.toBeInTheDocument();
});

test('shows a failed latest deployment for a Manager', async () => {
  signIn({ role: 'manager' });
  mockFetch(defaultRoutes({
    'GET /api/reports/summary': summaryFixture({
      deployments: { latest: { version: '1.3.9', status: 'failed', environment: 'production', commit_sha: 'bbbbbbb', started_at: '2026-10-01T10:00:00Z' }, failedLast7d: 2 }
    })
  }));
  renderApp();
  const region = await attentionList();
  expect(await within(region).findByText('Latest deployment 1.3.9 to production failed')).toBeInTheDocument();
  expect(within(region).getByRole('link', { name: 'View deployments' })).toHaveAttribute('href', '#deployments');
});

test('the Employee overview never shows deployment attention', async () => {
  signIn({ role: 'user' });
  mockFetch(defaultRoutes({
    'GET /api/reports/summary': summaryFixture({ deployments: { latest: { version: '1.3.9', status: 'failed', environment: 'production' }, failedLast7d: 1 } })
  }));
  renderApp();
  const region = await attentionList();
  expect(within(region).queryByText(/Latest deployment/)).not.toBeInTheDocument();
});

test('says Nothing needs attention when nothing applies', async () => {
  signIn({ role: 'admin' });
  mockFetch(defaultRoutes());
  renderApp();
  const region = await attentionList();
  expect(await within(region).findByText('Nothing needs attention right now.')).toBeInTheDocument();
  expect(within(region).getAllByRole('listitem')).toHaveLength(1);
});
