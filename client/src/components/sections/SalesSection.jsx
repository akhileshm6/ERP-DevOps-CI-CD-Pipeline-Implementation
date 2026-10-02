import React from 'react';
import { ShoppingBag, DollarSign, TrendingUp, RefreshCw, ZapOff } from 'lucide-react';
import { KpiCard } from '../common/KpiCard';
import { WidgetSkeleton, WidgetError, WidgetEmpty } from '../common/WidgetStates';
import { SalesChart } from '../charts/SalesChart';

export function SalesSection({
  queryState,
  range,
  onRangeChange,
  isSimulatingError,
  onToggleSimulateError
}) {
  const { data, isLoading, isError, error, refetch, isFetching } = queryState;

  const summary = data?.summary;
  const items = data?.data || [];

  return (
    <div className="domain-section sales">
      <div className="section-header">
        <div className="section-title-wrap">
          <div className="domain-icon-badge sales">
            <DollarSign size={20} />
          </div>
          <div>
            <h2 className="section-title">Sales & Revenue Velocity</h2>
            <p className="section-subtitle">Real-time order pipeline and gross billing metrics</p>
          </div>
        </div>

        <div className="section-actions">
          <div className="range-tabs">
            {['today', '7d', '30d', 'quarter'].map((r) => (
              <button
                key={r}
                className={`range-tab-btn ${range === r ? 'active' : ''}`}
                onClick={() => onRangeChange(r)}
              >
                {r === 'quarter' ? '90D' : r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            className={`icon-btn ${isSimulatingError ? 'active-error-sim' : ''}`}
            onClick={onToggleSimulateError}
            title={isSimulatingError ? 'Disable Error Simulation' : 'Simulate Sales API Failure (Test Widget Isolation)'}
          >
            <ZapOff size={15} />
          </button>

          <button
            className="icon-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Sales Data"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <WidgetSkeleton />
      ) : isError ? (
        <WidgetError error={error} onRetry={() => refetch()} title="Sales Metrics Offline" />
      ) : items.length === 0 ? (
        <WidgetEmpty title="No Sales Records" message="No sales orders were registered in this time period." />
      ) : (
        <>
          <div className="kpi-row">
            <KpiCard
              title="Total Revenue"
              value={`$${(summary?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              badgeText="+14.2%"
              badgeType="positive"
              icon={DollarSign}
            />
            <KpiCard
              title="Total Orders"
              value={summary?.orderCount || 0}
              subtitle="Processed orders"
              icon={ShoppingBag}
            />
            <KpiCard
              title="Avg Order Value"
              value={`$${(summary?.averageOrderValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              badgeText="AOV"
              badgeType="positive"
              icon={TrendingUp}
            />
            <KpiCard
              title="Completed Orders"
              value={summary?.completedOrders || 0}
              subtitle={`${summary?.pendingOrders || 0} pending fulfillment`}
              badgeText={summary?.pendingOrders > 0 ? `${summary.pendingOrders} Pending` : 'All Done'}
              badgeType={summary?.pendingOrders > 0 ? 'warning' : 'positive'}
            />
          </div>

          <SalesChart data={items} />
        </>
      )}
    </div>
  );
}
