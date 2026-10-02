import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Activity, Boxes, BriefcaseBusiness, DollarSign, Flag, LayoutDashboard, Users } from 'lucide-react';
import {
  fetchFinanceMetrics,
  fetchHrMetrics,
  fetchInventoryMetrics,
  fetchSalesMetrics
} from './api/metricsApi';
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

const deploymentHistory = [
  { id: 'dep-1042', version: 'v1.8.4', environment: 'Production', status: 'Succeeded', deployedAt: '2026-09-29T06:35:00Z', logsUrl: '/deployments/dep-1042/logs' },
  { id: 'dep-1041', version: 'v1.8.3', environment: 'Staging', status: 'Succeeded', deployedAt: '2026-09-28T14:20:00Z', logsUrl: '/deployments/dep-1041/logs' },
  { id: 'dep-1040', version: 'v1.8.3', environment: 'Production', status: 'Failed', deployedAt: '2026-09-28T11:15:00Z', logsUrl: '/deployments/dep-1040/logs' },
  { id: 'dep-1039', version: 'v1.8.2', environment: 'Development', status: 'Rolled back', deployedAt: '2026-09-27T09:05:00Z', logsUrl: '/deployments/dep-1039/logs' }
];

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

function getRoleFromToken() {
  try {
    const token = window.localStorage.getItem('token');
    const payload = token?.split('.')[1];
    if (!payload) return 'User';

    const base64Payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(window.atob(base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=')));
    if (typeof claims.exp === 'number' && claims.exp <= Date.now() / 1000) return 'User';

    const role = String(claims.role || '').trim().toLowerCase();
    if (role === 'admin') return 'Admin';
    if (role === 'manager') return 'Manager';
    return 'User';
  } catch {
    return 'User';
  }
}

function Dashboard() {
  const [ranges, setRanges] = useState({ sales: '30d', inventory: '30d', hr: '30d', finance: '30d' });
  const [activeDomain, setActiveDomain] = useState('all');
  const [activeAdminView, setActiveAdminView] = useState('overview');
  const [simulateSalesError, setSimulateSalesError] = useState(false);
  const [userRole] = useState(getRoleFromToken);
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
          <span className="status-pill"><span className="status-dot" /> Live metrics</span>
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

        {dashboardView.showDeploymentHistory && <DeploymentHistoryTable deployments={deploymentHistory} userRole={userRole} onRollback={(deployment) => window.alert(`Rollback requested for ${deployment.version} in ${deployment.environment}.`)} />}
      </>}
    </main>
  );
}

function App() {
  return <QueryClientProvider client={queryClient}><Dashboard /></QueryClientProvider>;
}

export default App;
