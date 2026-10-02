import React from 'react';
import { BadgeDollarSign, ChartNoAxesCombined, ReceiptText, RefreshCw, TrendingUp } from 'lucide-react';
import { FinanceChart } from '../charts/FinanceChart';
import { KpiCard } from '../common/KpiCard';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '../common/WidgetStates';

const ranges = ['today', '7d', '30d', 'quarter'];
const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export function FinanceSection({ queryState, range, onRangeChange }) {
  const { data, isLoading, isError, error, refetch, isFetching } = queryState;
  const summary = data?.summary;
  const items = data?.data || [];
  const isProfitable = (summary?.netProfit || 0) >= 0;

  return <section className="domain-section finance">
    <div className="section-header"><div className="section-title-wrap"><div className="domain-icon-badge finance"><BadgeDollarSign size={20} /></div><div><h2 className="section-title">Financial Performance</h2><p className="section-subtitle">Revenue, expenses, margin, and cash-flow distribution</p></div></div><div className="section-actions"><div className="range-tabs">{ranges.map((item) => <button key={item} className={`range-tab-btn ${range === item ? 'active' : ''}`} onClick={() => onRangeChange(item)}>{item === 'quarter' ? '90D' : item.toUpperCase()}</button>)}</div><button className="icon-btn" onClick={() => refetch()} disabled={isFetching} title="Refresh finance data"><RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} /></button></div></div>
    {isLoading ? <WidgetSkeleton /> : isError ? <WidgetError error={error} onRetry={refetch} title="Finance Metrics Offline" /> : items.length === 0 ? <WidgetEmpty title="No Finance Records" message="No finance transactions were recorded in this time period." /> : <><div className="kpi-row"><KpiCard title="Revenue" value={money(summary?.totalRevenue)} icon={TrendingUp} /><KpiCard title="Expenses" value={money(summary?.totalExpenses)} icon={ReceiptText} /><KpiCard title="Net Profit" value={money(summary?.netProfit)} badgeText={isProfitable ? 'Profitable' : 'Loss'} badgeType={isProfitable ? 'positive' : 'alert'} icon={ChartNoAxesCombined} /><KpiCard title="Profit Margin" value={`${Number(summary?.profitMargin || 0).toFixed(1)}%`} subtitle={`${summary?.transactionCount || 0} transactions`} icon={BadgeDollarSign} /></div><FinanceChart data={items} /></>}
  </section>;
}
