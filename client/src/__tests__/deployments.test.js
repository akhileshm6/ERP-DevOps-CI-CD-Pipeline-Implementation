import { screen, within } from '@testing-library/react';
import { defaultRoutes, mockFetch, renderApp, signIn } from '../test-utils';
import { ROLLBACK_WORKFLOW_URL } from '../components/deployments/DeploymentHistoryTable';

const historyTable = async () => {
  const table = await screen.findByRole('table', { name: 'Deployment history' });
  await within(table).findAllByText('1.3.9');
  return table;
};

test('status labels render as text', async () => {
  signIn({ role: 'manager' });
  mockFetch(defaultRoutes());
  renderApp({ hash: '#deployments' });
  const table = await historyTable();
  expect(within(table).getByText('Succeeded')).toBeInTheDocument();
  expect(within(table).getByText('Failed')).toBeInTheDocument();
  expect(within(table).getByText('Rolled back')).toBeInTheDocument();
  expect(within(table).queryByText('rolled_back')).not.toBeInTheDocument();
});

test('Admin: Roll back… reveals the commit SHA and the rollback workflow link', async () => {
  signIn({ role: 'admin' });
  mockFetch(defaultRoutes());
  const { user } = renderApp({ hash: '#deployments' });
  const table = await historyTable();

  // Not offered for a deployment that was already rolled back.
  expect(within(table).queryByRole('button', { name: /Roll back… 1\.3\.8/ })).not.toBeInTheDocument();

  const button = within(table).getByRole('button', { name: /Roll back… 1\.3\.9/ });
  expect(button).toHaveAttribute('aria-expanded', 'false');
  await user.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'true');

  const panel = screen.getByRole('region', { name: 'Roll back 1.3.9' });
  expect(within(panel).getByText('bbbbbbb2222222222222222222222222222222bb')).toBeInTheDocument();
  expect(within(panel).getByRole('link', { name: /Open Rollback workflow/ })).toHaveAttribute('href', ROLLBACK_WORKFLOW_URL);

  await user.click(within(panel).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('region', { name: 'Roll back 1.3.9' })).not.toBeInTheDocument();
});

test('Manager: no Roll back… control', async () => {
  signIn({ role: 'manager' });
  mockFetch(defaultRoutes());
  renderApp({ hash: '#deployments' });
  const table = await historyTable();
  expect(within(table).queryByRole('button', { name: /Roll back/ })).not.toBeInTheDocument();
});

test('status filter narrows the rows', async () => {
  signIn({ role: 'manager' });
  mockFetch(defaultRoutes());
  const { user } = renderApp({ hash: '#deployments' });
  const table = await historyTable();
  await user.selectOptions(screen.getByLabelText('Status'), 'failed');
  expect(within(table).getAllByText('1.3.9').length).toBeGreaterThan(0);
  expect(within(table).queryAllByText('1.4.0')).toHaveLength(0);
  expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument();
});
