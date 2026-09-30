import React from 'react';
import { AlertTriangle, Boxes, PackageCheck, RefreshCw, WalletCards } from 'lucide-react';
import { InventoryChart } from '../charts/InventoryChart';
import { KpiCard } from '../common/KpiCard';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '../common/WidgetStates';

const ranges = ['today', '7d', '30d', 'quarter'];
const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export function InventorySection({ queryState, range, onRangeChange }) {
  const { data, isLoading, isError, error, refetch, isFetching } = queryState;
  const summary = data?.summary;
  const items = data?.data || [];

  return <section className="domain-section inventory">
    <div className="section-header"><div className="section-title-wrap"><div className="domain-icon-badge inventory"><Boxes size={20} /></div><div><h2 className="section-title">Inventory Health</h2><p className="section-subtitle">Stock availability, reorder risk, and carrying value</p></div></div><div className="section-actions"><div className="range-tabs">{ranges.map((item) => <button key={item} className={`range-tab-btn ${range === item ? 'active' : ''}`} onClick={() => onRangeChange(item)}>{item === 'quarter' ? '90D' : item.toUpperCase()}</button>)}</div><button className="icon-btn" onClick={() => refetch()} disabled={isFetching} title="Refresh inventory data"><RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} /></button></div></div>
    {isLoading ? <WidgetSkeleton /> : isError ? <WidgetError error={error} onRetry={refetch} title="Inventory Metrics Offline" /> : items.length === 0 ? <WidgetEmpty title="No Inventory Records" message="No inventory items were recorded in this time period." /> : <><div className="kpi-row"><KpiCard title="Stock Value" value={money(summary?.stockValue)} icon={WalletCards} /><KpiCard title="Items Tracked" value={summary?.itemCount || 0} subtitle="Active SKUs" icon={Boxes} /><KpiCard title="Units on Hand" value={(summary?.totalQuantity || 0).toLocaleString()} subtitle="Across all tracked items" icon={PackageCheck} /><KpiCard title="Low Stock" value={summary?.lowStockCount || 0} badgeText={summary?.lowStockCount ? 'Reorder needed' : 'Healthy'} badgeType={summary?.lowStockCount ? 'alert' : 'positive'} icon={AlertTriangle} /></div><InventoryChart data={items} /></>}
  </section>;
}
