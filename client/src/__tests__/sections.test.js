import { screen, waitFor, within } from '@testing-library/react';
import { defaultRoutes, deferred, financeFixture, hrFixture, json, mockFetch, renderApp, salesFixture, sequence, signIn } from '../test-utils';

beforeEach(() => signIn({ role: 'admin', name: 'Ada Admin' }));

test('shows a loading state while the request is pending', async () => {
  const pending = deferred();
  mockFetch(defaultRoutes({ 'GET /api/metrics/sales': () => pending.promise }));
  renderApp({ hash: '#sales' });
  expect(await screen.findByText('Loading sales…')).toBeInTheDocument();
  pending.resolve(salesFixture());
  expect(await screen.findByLabelText('Sales figures')).toBeInTheDocument();
  expect(screen.queryByText('Loading sales…')).not.toBeInTheDocument();
});

test('shows the error state, and Retry loads the data', async () => {
  const failure = json({ error: 'HR service unavailable' }, 500);
  // The app retries once automatically, so two failures reach the error state.
  const fetchMock = mockFetch(defaultRoutes({ 'GET /api/metrics/hr': sequence(failure, failure, hrFixture()) }));
  const { user } = renderApp({ hash: '#people' });

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('People data unavailable');
  expect(alert).toHaveTextContent('HR service unavailable');
  expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();

  await user.click(within(alert).getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(fetchMock.callsTo('GET', '/api/metrics/hr')).toHaveLength(3);
  // A 500 is not an auth failure: still signed in.
  expect(window.localStorage.getItem('token')).not.toBeNull();
});

test('shows the empty state when data is an empty list', async () => {
  mockFetch(defaultRoutes({ 'GET /api/metrics/finance': { ...financeFixture(), data: [] } }));
  renderApp({ hash: '#finance' });
  expect(await screen.findByText('No transactions')).toBeInTheDocument();
  expect(screen.queryByLabelText('Finance figures')).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('changing the period refetches with the new range', async () => {
  const fetchMock = mockFetch(defaultRoutes({ 'GET /api/metrics/sales': (req) => salesFixture({ totalRevenue: req.query.range === '7d' ? 777 : 12345.6 }) }));
  const { user } = renderApp({ hash: '#sales' });
  const kpis = await screen.findByLabelText('Sales figures');
  expect(within(kpis).getByText('$12,346')).toBeInTheDocument();
  expect(fetchMock.callsTo('GET', '/api/metrics/sales').map((call) => call.parsed.searchParams.get('range'))).toEqual(['30d']);

  const period = screen.getByRole('group', { name: 'Sales period' });
  await user.click(within(period).getByRole('button', { name: '7 days' }));

  expect(within(period).getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  expect(await within(await screen.findByLabelText('Sales figures')).findByText('$777')).toBeInTheDocument();
  await waitFor(() => expect(fetchMock.callsTo('GET', '/api/metrics/sales').map((call) => call.parsed.searchParams.get('range'))).toEqual(['30d', '7d']));
  expect(screen.getAllByText('Last 7 days').length).toBeGreaterThan(0);
});

test('KPI values are formatted as currency', async () => {
  mockFetch(defaultRoutes());
  renderApp({ hash: '#finance' });
  const kpis = await screen.findByLabelText('Finance figures');
  expect(within(kpis).getByText('$50,000')).toBeInTheDocument();
  expect(within(kpis).getByText('$20,000')).toBeInTheDocument();
  expect(within(kpis).getByText('$30,000')).toBeInTheDocument();
  expect(within(kpis).getByText('Net profit')).toBeInTheDocument();
  // Expense rows show a minus sign with cents.
  expect(screen.getByRole('table', { name: 'Recent transactions' })).toHaveTextContent('−$20,000.00');
});

test('a net loss is labelled as a loss', async () => {
  mockFetch(defaultRoutes({ 'GET /api/metrics/finance': { ...financeFixture(), summary: { ...financeFixture().summary, netProfit: -1500 } } }));
  renderApp({ hash: '#finance' });
  const kpis = await screen.findByLabelText('Finance figures');
  expect(within(kpis).getByText('Net loss')).toBeInTheDocument();
  expect(within(kpis).getByText('-$1,500')).toBeInTheDocument();
});

describe('new-finance-chart feature flag', () => {
  const byText = (text) => (_, element) => element?.tagName === 'P' && element.textContent.includes(text);

  test('the category chart renders when the flag is on', async () => {
    mockFetch(defaultRoutes());
    renderApp({ hash: '#finance' });
    expect(await screen.findByText('Revenue and expenses by category')).toBeInTheDocument();
    expect(screen.queryByText(byText('turned off for your role'))).not.toBeInTheDocument();
  });

  test('the chart is hidden with a note when the flag is off', async () => {
    mockFetch(defaultRoutes({ 'GET /api/flags/evaluate': { role: 'Manager', environment: 'staging', enabled: [], flags: { 'new-finance-chart': false } } }));
    renderApp({ hash: '#finance' });
    expect(await screen.findByText(byText('Category chart is turned off for your role by the new-finance-chart feature flag.'))).toBeInTheDocument();
    expect(screen.queryByText('Revenue and expenses by category')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Finance figures')).toBeInTheDocument();
  });

  test('says the chart is unavailable when flags cannot be evaluated', async () => {
    mockFetch(defaultRoutes({ 'GET /api/flags/evaluate': json({ error: 'boom' }, 500) }));
    renderApp({ hash: '#finance' });
    expect(await screen.findByText('Category chart unavailable: feature flags could not be loaded.')).toBeInTheDocument();
    expect(screen.queryByText('Revenue and expenses by category')).not.toBeInTheDocument();
  });
});
