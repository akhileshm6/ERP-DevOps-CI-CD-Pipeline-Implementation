import React from 'react';
import { BadgeCheck, Building2, RefreshCw, Star, Users } from 'lucide-react';
import { HRChart } from '../charts/HRChart';
import { KpiCard } from '../common/KpiCard';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '../common/WidgetStates';

const ranges = ['today', '7d', '30d', 'quarter'];

export function HRSection({ queryState, range, onRangeChange }) {
  const { data, isLoading, isError, error, refetch, isFetching } = queryState;
  const summary = data?.summary;
  const items = data?.data || [];

  return <section className="domain-section hr">
    <div className="section-header"><div className="section-title-wrap"><div className="domain-icon-badge hr"><Users size={20} /></div><div><h2 className="section-title">People & Performance</h2><p className="section-subtitle">Workforce capacity, compensation, and performance indicators</p></div></div><div className="section-actions"><div className="range-tabs">{ranges.map((item) => <button key={item} className={`range-tab-btn ${range === item ? 'active' : ''}`} onClick={() => onRangeChange(item)}>{item === 'quarter' ? '90D' : item.toUpperCase()}</button>)}</div><button className="icon-btn" onClick={() => refetch()} disabled={isFetching} title="Refresh HR data"><RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} /></button></div></div>
    {isLoading ? <WidgetSkeleton /> : isError ? <WidgetError error={error} onRetry={refetch} title="HR Metrics Offline" /> : items.length === 0 ? <WidgetEmpty title="No Employee Records" message="No employee records were created in this time period." /> : <><div className="kpi-row"><KpiCard title="Team Members" value={summary?.totalEmployees || 0} subtitle="In selected period" icon={Users} /><KpiCard title="Active Employees" value={summary?.activeCount || 0} badgeText={`${summary?.totalEmployees ? Math.round((summary.activeCount / summary.totalEmployees) * 100) : 0}% active`} badgeType="positive" icon={BadgeCheck} /><KpiCard title="Average Salary" value={`$${Number(summary?.averageSalary || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={Building2} /><KpiCard title="Performance" value={`${Number(summary?.avgPerformance || 0).toFixed(1)} / 5`} subtitle={`${summary?.departmentCount || 0} departments`} icon={Star} /></div><HRChart data={items} /></>}
  </section>;
}
