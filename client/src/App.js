import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fetchFinanceMetrics, fetchHrMetrics, fetchInventoryMetrics, fetchSalesMetrics } from './api/metricsApi';
import { getSessionFromToken, LOGOUT_EVENT, logout } from './api/client';
import { useHashTab } from './hooks/useHashTab';
import { useStatus } from './hooks/useStatus';
import { LoginForm } from './components/auth/LoginForm';
import { AppHeader } from './components/layout/AppHeader';
import { TabNav } from './components/layout/TabNav';
import { Overview } from './components/overview/Overview';
import { SalesSection } from './components/sections/SalesSection';
import { InventorySection } from './components/sections/InventorySection';
import { HRSection } from './components/sections/HRSection';
import { FinanceSection } from './components/sections/FinanceSection';
import { DeploymentsView } from './components/deployments/DeploymentsView';
import { FeatureFlagConsole } from './components/admin/FeatureFlagConsole';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false }
  }
});

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const INVENTORY_RANGE = '30d'; // the inventory API returns a snapshot and ignores the range

const ALL_TABS = [
  { id: 'overview', label: 'Overview', roles: ['Admin', 'Manager', 'User'] },
  { id: 'sales', label: 'Sales', roles: ['Admin', 'Manager', 'User'] },
  { id: 'inventory', label: 'Inventory', roles: ['Admin', 'Manager', 'User'] },
  { id: 'people', label: 'People', roles: ['Admin', 'Manager'] },
  { id: 'finance', label: 'Finance', roles: ['Admin', 'Manager'] },
  { id: 'deployments', label: 'Deployments', roles: ['Admin', 'Manager'] },
  { id: 'flags', label: 'Feature flags', roles: ['Admin'] }
];

function SalesTab({ range, onRangeChange }) {
  const [simulateError, setSimulateError] = useState(false);
  const query = useQuery({
    queryKey: ['metrics', 'sales', range, simulateError],
    queryFn: () => (simulateError ? Promise.reject(new Error('Simulated Sales API failure (developer tool).')) : fetchSalesMetrics(range))
  });
  const devTools = IS_DEVELOPMENT ? (
    <div className="dev-tools">
      <span className="field-label">Developer tool (development builds only)</span>
      <button type="button" className="btn btn-small" aria-pressed={simulateError} onClick={() => setSimulateError((current) => !current)}>
        {simulateError ? 'Stop simulating Sales API failure' : 'Simulate Sales API failure'}
      </button>
    </div>
  ) : null;
  return <SalesSection queryState={query} range={range} onRangeChange={onRangeChange} devTools={devTools} />;
}

function InventoryTab() {
  const query = useQuery({ queryKey: ['metrics', 'inventory'], queryFn: () => fetchInventoryMetrics(INVENTORY_RANGE) });
  return <InventorySection queryState={query} />;
}

function PeopleTab({ range, onRangeChange }) {
  const query = useQuery({ queryKey: ['metrics', 'hr', range], queryFn: () => fetchHrMetrics(range) });
  return <HRSection queryState={query} range={range} onRangeChange={onRangeChange} />;
}

function FinanceTab({ range, onRangeChange }) {
  const query = useQuery({ queryKey: ['metrics', 'finance', range], queryFn: () => fetchFinanceMetrics(range) });
  return <FinanceSection queryState={query} range={range} onRangeChange={onRangeChange} />;
}

function Dashboard({ session, onLogout }) {
  const userRole = session.role;
  const tabs = useMemo(() => ALL_TABS.filter((tab) => tab.roles.includes(userRole)), [userRole]);
  const tabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);
  const activeTab = useHashTab(tabIds, 'overview');
  const [ranges, setRanges] = useState({ sales: '30d', hr: '30d', finance: '30d' });
  const setRange = (domain) => (range) => setRanges((current) => ({ ...current, [domain]: range }));
  const statusQuery = useStatus();
  const isManager = userRole === 'Admin' || userRole === 'Manager';
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label;

  useEffect(() => {
    document.title = activeLabel ? `${activeLabel} · SP301 ERP` : 'SP301 ERP';
  }, [activeLabel]);

  let content;
  switch (activeTab) {
    case 'sales': content = <SalesTab range={ranges.sales} onRangeChange={setRange('sales')} />; break;
    case 'inventory': content = <InventoryTab />; break;
    case 'people': content = <PeopleTab range={ranges.hr} onRangeChange={setRange('hr')} />; break;
    case 'finance': content = <FinanceTab range={ranges.finance} onRangeChange={setRange('finance')} />; break;
    case 'deployments': content = <DeploymentsView userRole={userRole} />; break;
    case 'flags': content = <FeatureFlagConsole />; break;
    default: content = <Overview isManager={isManager} statusQuery={statusQuery} />;
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AppHeader session={session} statusQuery={statusQuery} onLogout={onLogout} />
      <TabNav tabs={tabs} activeTab={activeTab} />
      <main id="main-content" className="app-main" tabIndex={-1} aria-label={activeLabel}>
        {content}
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(() => getSessionFromToken());
  const [notice, setNotice] = useState('');

  const endSession = useCallback((message = '') => {
    queryClient.clear();
    setSession(null);
    setNotice(message);
  }, []);

  useEffect(() => {
    const handleLogout = () => endSession('Your session has ended. Please sign in again.');
    window.addEventListener(LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(LOGOUT_EVENT, handleLogout);
  }, [endSession]);

  useEffect(() => {
    if (typeof session?.exp !== 'number') return undefined;
    const msUntilExpiry = session.exp * 1000 - Date.now();
    const timer = window.setTimeout(() => logout(), Math.max(0, Math.min(msUntilExpiry, 2147483647)));
    return () => window.clearTimeout(timer);
  }, [session]);

  const handleLogin = () => {
    setNotice('');
    setSession(getSessionFromToken());
  };
  const handleLogout = () => {
    logout();
    setNotice('');
  };

  return (
    <QueryClientProvider client={queryClient}>
      {session ? <Dashboard key={session.id ?? session.name} session={session} onLogout={handleLogout} /> : <LoginForm onLogin={handleLogin} notice={notice} />}
    </QueryClientProvider>
  );
}

export default App;
