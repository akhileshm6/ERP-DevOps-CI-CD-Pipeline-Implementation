import { screen, waitFor, within } from '@testing-library/react';
import { defaultRoutes, json, makeToken, mockFetch, renderApp, signIn, statusFixture } from '../test-utils';

const loginHeading = () => screen.findByRole('heading', { name: 'SP301 ERP', level: 1 });

test('without a token the login form is shown', async () => {
  mockFetch({ 'GET /api/status': statusFixture() });
  renderApp();
  expect(await loginHeading()).toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
});

test('a successful login stores the token and shows the dashboard with name and role', async () => {
  const token = makeToken({ id: 7, role: 'manager', name: 'Maria Manager' });
  const fetchMock = mockFetch(defaultRoutes({
    'POST /api/auth/login': (req) => (req.body.email === 'maria@erp.local' && req.body.password === 'pw'
      ? json({ token, role: 'Manager', name: 'Maria Manager' })
      : json({ error: 'Invalid credentials' }, 401))
  }));
  const { user } = renderApp();
  await user.type(await screen.findByLabelText('Email'), '  maria@erp.local ');
  await user.type(screen.getByLabelText('Password'), 'pw');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));

  const banner = await screen.findByRole('banner');
  expect(within(banner).getByText('Maria Manager')).toBeInTheDocument();
  expect(within(banner).getByText('Manager')).toBeInTheDocument();
  expect(window.localStorage.getItem('token')).toBe(token);
  // Authenticated requests carry the bearer token.
  await waitFor(() => expect(fetchMock.callsTo('GET', '/api/reports/summary').length).toBeGreaterThan(0));
  expect(fetchMock.callsTo('GET', '/api/reports/summary')[0].init.headers.Authorization).toBe(`Bearer ${token}`);
});

test('a 401 on login shows an error and stays on the login form', async () => {
  mockFetch({ 'GET /api/status': statusFixture(), 'POST /api/auth/login': json({ error: 'Invalid credentials' }, 401) });
  const { user } = renderApp();
  await user.type(await screen.findByLabelText('Email'), 'x@erp.local');
  await user.type(screen.getByLabelText('Password'), 'wrong');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  expect(window.localStorage.getItem('token')).toBeNull();
});

test('an expired token in localStorage shows the login form', async () => {
  signIn({ role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 });
  mockFetch(defaultRoutes());
  renderApp();
  expect(await loginHeading()).toBeInTheDocument();
  expect(screen.queryByRole('banner')).not.toBeInTheDocument();
});

test('a malformed token shows the login form', async () => {
  window.localStorage.setItem('token', 'not-a-jwt');
  mockFetch(defaultRoutes());
  renderApp();
  expect(await loginHeading()).toBeInTheDocument();
});

test('a 401 from a data call logs the user out back to login', async () => {
  signIn({ role: 'user', name: 'Eve Employee' });
  mockFetch(defaultRoutes({ 'GET /api/metrics/sales': json({ error: 'Token expired' }, 401) }));
  renderApp();
  expect(await loginHeading()).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Your session has ended');
  expect(window.localStorage.getItem('token')).toBeNull();
});

test('Log out clears the token and returns to login', async () => {
  signIn({ role: 'admin', name: 'Ada Admin' });
  mockFetch(defaultRoutes());
  const { user } = renderApp();
  await user.click(await screen.findByRole('button', { name: 'Log out' }));
  expect(await loginHeading()).toBeInTheDocument();
  expect(window.localStorage.getItem('token')).toBeNull();
  expect(screen.queryByText('Your session has ended', { exact: false })).not.toBeInTheDocument();
});
