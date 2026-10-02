import { act, screen, waitFor, within } from '@testing-library/react';
import { defaultRoutes, json, mockFetch, renderApp, salesFixture, signIn, statusFixture } from '../test-utils';

describe('sales trend', () => {
  test('is shown when previousPeriodRevenue is a number', async () => {
    signIn({ role: 'manager' });
    mockFetch(defaultRoutes({ 'GET /api/metrics/sales': salesFixture({ totalRevenue: 11000, previousPeriodRevenue: 10000 }) }));
    renderApp({ hash: '#sales' });
    const kpis = await screen.findByLabelText('Sales figures');
    expect(within(kpis).getByText('+10.0% vs previous period')).toBeInTheDocument();
  });

  test('is not shown, and no percentage is invented, when previousPeriodRevenue is null', async () => {
    signIn({ role: 'manager' });
    mockFetch(defaultRoutes({ 'GET /api/metrics/sales': salesFixture({ previousPeriodRevenue: null }) }));
    renderApp({ hash: '#sales' });
    const kpis = await screen.findByLabelText('Sales figures');
    expect(within(kpis).getByText('No prior-period data')).toBeInTheDocument();
    expect(within(kpis).queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+14\.2%/)).not.toBeInTheDocument();
  });
});

describe('header system status', () => {
  const headerStatus = async (routes) => {
    signIn({ role: 'user' });
    mockFetch(defaultRoutes(routes));
    renderApp();
    const banner = await screen.findByRole('banner');
    await within(banner).findByText(/Operational|Degraded/);
    return banner;
  };

  test('says Operational when ready is true', async () => {
    const banner = await headerStatus({});
    expect(within(banner).getByText('Operational')).toBeInTheDocument();
    expect(within(banner).queryByText('Degraded')).not.toBeInTheDocument();
  });

  test('says Degraded when ready is false', async () => {
    const banner = await headerStatus({ 'GET /api/status': statusFixture({ ready: false, database: 'disconnected' }) });
    expect(within(banner).getByText('Degraded')).toBeInTheDocument();
    expect(within(banner).queryByText('Operational')).not.toBeInTheDocument();
  });

  test('says Degraded when the status request fails', async () => {
    const banner = await headerStatus({ 'GET /api/status': json({ error: 'down' }, 503) });
    expect(within(banner).getByText('Degraded')).toBeInTheDocument();
  });

  test('a network failure on status is Degraded, not a logout', async () => {
    const banner = await headerStatus({ 'GET /api/status': () => Promise.reject(new TypeError('Failed to fetch')) });
    expect(within(banner).getByText('Degraded')).toBeInTheDocument();
  });
});

describe('demo data', () => {
  test('the Demo data label shows only for dataSource demo', async () => {
    signIn({ role: 'user' });
    mockFetch(defaultRoutes({ 'GET /api/status': statusFixture({ dataSource: 'demo' }) }));
    renderApp();
    const banner = await screen.findByRole('banner');
    expect(await within(banner).findByText('Demo data')).toBeInTheDocument();
  });

  test('no Demo data label for live data', async () => {
    signIn({ role: 'user' });
    mockFetch(defaultRoutes({ 'GET /api/status': statusFixture({ dataSource: 'live' }) }));
    renderApp();
    const banner = await screen.findByRole('banner');
    await within(banner).findByText('Operational');
    expect(within(banner).queryByText('Demo data')).not.toBeInTheDocument();
  });

  test('demo account buttons on login show only for demo and fill the form', async () => {
    mockFetch({ 'GET /api/status': statusFixture({ dataSource: 'demo' }) });
    const { user } = renderApp();
    await user.click(await screen.findByRole('button', { name: 'Fill Manager demo account' }));
    expect(screen.getByLabelText('Email')).toHaveValue('manager@erp.local');
    expect(screen.getByLabelText('Password')).not.toHaveValue('');
  });

  test('no demo account buttons for live data', async () => {
    const fetchMock = mockFetch({ 'GET /api/status': statusFixture({ dataSource: 'live' }) });
    renderApp();
    await screen.findByRole('button', { name: 'Sign in' });
    await waitFor(() => expect(fetchMock.callsTo('GET', '/api/status').length).toBeGreaterThan(0));
    await act(async () => {}); // let the status response render
    expect(screen.queryByRole('group', { name: 'Demo accounts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /demo account/ })).not.toBeInTheDocument();
  });
});
