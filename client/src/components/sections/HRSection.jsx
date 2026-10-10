import React, { useMemo } from 'react';
import { KpiStrip } from '../common/KpiStrip';
import { DataTable } from '../common/DataTable';
import { RangeSelector } from '../common/RangeSelector';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '../common/WidgetStates';
import { HRChart } from '../charts/HRChart';
import { formatCurrency, formatDate, formatNumber, rangePeriod } from '../../utils/format';

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'department', header: 'Department' },
  { key: 'role', header: 'Role' },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge tone={row.status === 'Active' ? 'success' : 'neutral'}>{row.status || 'Unknown'}</StatusBadge> },
  { key: 'hireDate', header: 'Hire date', render: (row) => <span className="num">{formatDate(row.hireDate)}</span> }
];

export function HRSection({ queryState, range, onRangeChange }) {
  const { data, isLoading, isError, error, refetch, isFetching } = queryState;
  const summary = data?.summary;
  const people = useMemo(() => [...(data?.data || [])].sort((a, b) => String(a.name).localeCompare(String(b.name))), [data]);

  return (
    <section className="section" aria-labelledby="people-title">
      <SectionHeader id="people-title" title="People" description="Current headcount by department. The period applies to new hires only." onRefresh={refetch} isFetching={isFetching}>
        <RangeSelector value={range} onChange={onRangeChange} label="New hires period" />
      </SectionHeader>

      {isLoading ? <WidgetSkeleton label="Loading people" />
        : isError ? <WidgetError error={error} onRetry={refetch} title="People data unavailable" />
        : people.length === 0 ? <WidgetEmpty title="No employee records" message="No employees are recorded." />
        : <>
          <KpiStrip label="People figures" items={[
            { label: 'Headcount', value: formatNumber(summary?.totalEmployees), period: 'Current', note: `${formatNumber(summary?.departmentCount)} departments` },
            { label: 'Active', value: formatNumber(summary?.activeCount), period: 'Current', note: `${formatNumber(summary?.onLeaveCount)} on leave` },
            { label: 'New hires', value: formatNumber(summary?.newHires), period: rangePeriod(range) },
            { label: 'Average salary', value: formatCurrency(summary?.averageSalary), period: 'Current' },
            { label: 'Average rating', value: Number(summary?.avgPerformance || 0).toFixed(1), unit: '/ 5', period: 'Current' }
          ]} />
          <HRChart data={people} />
          <DataTable caption="Employees" columns={columns} rows={people} />
        </>}
    </section>
  );
}
