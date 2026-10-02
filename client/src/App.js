import React, { useCallback, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Activity, Boxes, BriefcaseBusiness, DollarSign, Flag, GitCommitHorizontal, LayoutDashboard, LogOut, Users } from 'lucide-react';
import {
  fetchFinanceMetrics,
  fetchHrMetrics,
  fetchInventoryMetrics,
  fetchSalesMetrics
} from './api/metricsApi';
import { fetchCurrentDeployment, fetchDeployments } from './api/deploymentsApi';
import { getSessionFromToken, LOGOUT_EVENT, logout } from './api/client';
import { LoginForm } from './components/auth/LoginForm';
import { WidgetEmpty, WidgetError } from './components/common/WidgetStates';
import { SalesSection } from './components/sections/SalesSection';
import { InventorySection } from './components/sections/InventorySection';
import { HRSection } from './components/sections/HRSection';
import { FinanceSection } from './components/sections/FinanceSection';
import { DeploymentHistoryTable } from './components/deployments/DeploymentHistoryTable';
import { FeatureFlagConsole } from './components/admin/FeatureFlagConsole';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false }
  }
});

const DEPLOYMENT_FETCH_LIMIT = 50;

const dashboardViews = {
  Admin: {
    description: 'Full business overview and deployment controls.',
    domains: ['sales', 'inventory', 'hr', 'finance'],
    showDeploymentHistory: true
  },
  Manager: {
    description: 'Business performance and release oversight.',
    domains: ['sales', 'inventory', 'hr', 'finance'],
    showDeploymentHistory: true
  },
  User: {
    description: 'Sales and inventory overview.',
    domains: ['sales', 'inventory'],
    showDeploymentHistory: false
  }
};

function DeploymentHistoryPanel({ userRole }) {
  const deploymentsQuery = useQuery({
    queryKey: ['deployments', 1, DEPLOYMENT_FETCH_LIMIT],
    queryFn: () => fetchDeployments({ page: 1, limit: DEPLOYMENT_FETCH_LIMIT })
  });

  if (deploymentsQuery.isError) {
    return <section className="deployment-history"><WidgetError title="Deployment history unavailable" error={deploymentsQuery.error} onRetry={() => deploymentsQuery.refetch()} /></section>;
  }
  const deployments = deploymentsQuery.data?.data || [];
  if (deploymentsQuery.isSuccess && deployments.length === 0) {
    return <section className="deployment-history"><WidgetEmpty title="No deployments yet" message="New releases will appear here once the pipeline records them." /></section>;
  }
  return <DeploymentHistoryTable deployments={deployments} userRole={userRole} isLoading={deploymentsQuery.isLoading} onRollback={(deployment) => window.alert(`Rollback for ${deployment.version} in ${deployment.environment} is run from the manual rollback workflow in CI.`)} />;
}

function Dashboard({ session, onLogout }) {
  const [ranges, setRanges] = useState({ sales: '30d', inventory: '30d', hr: '30d', finance: '30d' });
  const [activeDomain, setActiveDomain] = useState('all');
  const [activeAdminView, setActiveAdminView] = useState('overview');
  const [simulateSalesError, setSimulateSalesError] = useState(false);
  const userRole = session.role;
  const dashboardView = dashboardViews[userRole];

  const salesQuery = useQuery({
    queryKey: ['metrics', 'sales', ranges.sales, simulateSalesError],
    queryFn: () => {
      if (simulateSalesError) return Promise.reject(new Error('Sales API failure simulation is enabled.'));
      return fetchSalesMetrics(ranges.sales);
    }
  });
  const inventoryQuery = useQuery({
    queryKey: ['metrics', 'inventory', ranges.inventory],
    queryFn: () => fetchInventoryMetrics(ranges.inventory)
  });
  const hrQuery = useQuery({
    queryKey: ['metrics', 'hr', ranges.hr],
    queryFn: () => fetchHrMetrics(ranges.hr),
    enabled: userRole !== 'User'
  });
  const financeQuery = useQuery({
    queryKey: ['metrics', 'finance', ranges.finance],
    queryFn: () => fetchFinanceMetrics(ranges.finance),
    enabled: userRole !== 'User'
  });

  const currentDeploymentQuery = useQuery({ queryKey: ['deployments', 'current'], queryFn: fetchCurrentDeployment });
  const currentVersion = currentDeploymentQuery.data?.version;

  const setRange = (domain) => (range) => setRanges((current) => ({ ...current, [domain]: range }));
  const domains = [
    { id: 'sales', label: 'Sales', Icon: DollarSign, section: <SalesSection queryState={salesQuery} range={ranges.sales} onRangeChange={setRange('sales')} isSimulatingError={simulateSalesError} onToggleSimulateError={() => setSimulateSalesError((current) => !current)} /> },
    { id: 'inventory', label: 'Inventory', Icon: Boxes, section: <InventorySection queryState={inventoryQuery} range={ranges.inventory} onRangeChange={setRange('inventory')} /> },
    { id: 'hr', label: 'HR', Icon: Users, section: <HRSection queryState={hrQuery} range={ranges.hr} onRangeChange={setRange('hr')} /> },
    { id: 'finance', label: 'Finance', Icon: BriefcaseBusiness, section: <FinanceSection queryState={financeQuery} range={ranges.finance} onRangeChange={setRange('finance')} /> }
  ];
  const visibleDomains = domains.filter(({ id }) => dashboardView.domains.includes(id));

  return (
    <main className="dashboard-container">
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="brand-logo"><LayoutDashboard size={24} /></div>
          <div className="brand-info">
            <h1>ERP Metrics Dashboard</h1>
            <p>{userRole === 'Admin' && activeAdminView === 'flags' ? 'Manage rollout and role targeting for dashboard features.' : dashboardView.description}</p>
          </div>
        </div>
        <div className="header-actions">
          {currentVersion && <span className="current-version-pill" title={[currentDeploymentQuery.data.environment, currentDeploymentQuery.data.commitSha, currentDeploymentQuery.data.deployedAt].filter(Boolean).join(' · ')}><GitCommitHorizontal size={13} aria-hidden="true" /> {currentVersion}</span>}
          <span className="status-pill"><span className="status-dot" /> Live metrics</span>
          <span className="user-chip"><strong>{session.name || 'Signed in'}</strong><span className="user-role-badge">{userRole}</span></span>
          <button type="button" className="btn-secondary" onClick={onLogout}><LogOut size={14} aria-hidden="true" /> Log out</button>
        </div>
      </header>

      {userRole === 'Admin' && <nav className="dashboard-view-tabs" aria-label="Admin dashboard views">
        <button type="button" className={activeAdminView === 'overview' ? 'active' : ''} aria-current={activeAdminView === 'overview' ? 'page' : undefined} onClick={() => setActiveAdminView('overview')}><LayoutDashboard size={15} /> Overview</button>
        <button type="button" className={activeAdminView === 'flags' ? 'active' : ''} aria-current={activeAdminView === 'flags' ? 'page' : undefined} onClick={() => setActiveAdminView('flags')}><Flag size={15} /> Feature flags</button>
      </nav>}

      {userRole === 'Admin' && activeAdminView === 'flags' ? <FeatureFlagConsole /> : <>
        <nav className="domain-filter-bar" aria-label="Dashboard domains">
          <button className={`domain-pill-btn ${activeDomain === 'all' ? 'active-all' : ''}`} onClick={() => setActiveDomain('all')}><Activity size={15} /> All domains</button>
          {visibleDomains.map(({ id, label, Icon }) => <button key={id} className={`domain-pill-btn ${activeDomain === id ? `active-${id}` : ''}`} onClick={() => setActiveDomain(id)}><Icon size={15} /> {label}</button>)}
        </nav>

        <section className="dashboard-grid" aria-label="Business metrics">
          {visibleDomains.filter(({ id }) => activeDomain === 'all' || activeDomain === id).map(({ id, section }) => <React.Fragment key={id}>{section}</React.Fragment>)}
        </section>

        {dashboardView.showDeploymentHistory && <DeploymentHistoryPanel userRole={userRole} />}
      </>}
    </main>
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
