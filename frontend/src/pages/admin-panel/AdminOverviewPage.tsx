import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flag, ShieldCheck } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { qk } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ChartCard, SimpleBarChart, SimpleLineChart } from '@/components/common/charts';
import { ErrorState, PageLoader } from '@/components/common/feedback';
import { PageHeader, Stat } from '@/components/common/ui';
import { formatCompact, formatDate } from '@/utils/format';

const inr = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);

export default function AdminOverviewPage() {
  useDocumentTitle('Platform overview');
  const q = useQuery({ queryKey: qk.adminOverview, queryFn: adminService.overview });
  if (q.isLoading) return <PageLoader />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  const dau = d.dau_series.map((x) => ({ ...x, day: formatDate(x.date, 'd MMM') }));

  return (
    <div>
      <PageHeader title="Platform overview" />

      {(d.pending_courses > 0 || d.flagged_posts > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {d.pending_courses > 0 && (
            <Link
              to="/admin/approvals"
              className="flex items-center gap-2 rounded border border-warn/40 bg-warn/10 px-3 py-2 text-sm hover:border-warn"
            >
              <ShieldCheck className="h-4 w-4 text-warn" /> {d.pending_courses}{' '}
              {d.pending_courses === 1 ? 'course awaits' : 'courses await'} approval
            </Link>
          )}
          {d.flagged_posts > 0 && (
            <Link
              to="/admin/moderation"
              className="flex items-center gap-2 rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm hover:border-danger"
            >
              <Flag className="h-4 w-4 text-danger" /> {d.flagged_posts} reported{' '}
              {d.flagged_posts === 1 ? 'post' : 'posts'} to review
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 md:grid-cols-5">
        <Stat label="Daily active users" value={formatCompact(d.dau)} />
        <Stat label="Total users" value={formatCompact(d.total_users)} />
        <Stat label="Enrollments" value={formatCompact(d.total_enrollments)} />
        <Stat label="Completion rate" value={`${d.completion_rate}%`} />
        <Stat label="Revenue (all time)" value={inr(d.revenue)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard
          className="lg:col-span-2"
          title="Daily active users"
          subtitle="Last 30 days"
          data={dau}
          xKey="day"
          xLabel="Day"
          series={[{ key: 'dau', label: 'Active users' }]}
        >
          <SimpleLineChart data={dau} xKey="day" series={[{ key: 'dau', label: 'Active users' }]} />
        </ChartCard>
        <ChartCard
          title="Enrollments and completions"
          subtitle="Per month"
          data={d.enrollment_series}
          xKey="month"
          xLabel="Month"
          series={[
            { key: 'enrollments', label: 'Enrollments' },
            { key: 'completions', label: 'Completions' },
          ]}
        >
          <SimpleBarChart
            data={d.enrollment_series}
            xKey="month"
            series={[
              { key: 'enrollments', label: 'Enrollments' },
              { key: 'completions', label: 'Completions' },
            ]}
          />
        </ChartCard>
        <ChartCard
          title="Revenue"
          subtitle="Successful payments per month"
          data={d.revenue_series}
          xKey="month"
          xLabel="Month"
          series={[{ key: 'revenue', label: 'Revenue', format: inr }]}
        >
          <SimpleBarChart
            data={d.revenue_series}
            xKey="month"
            series={[{ key: 'revenue', label: 'Revenue', format: inr }]}
          />
        </ChartCard>
        <ChartCard
          className="lg:col-span-2"
          title="Live courses by category"
          data={d.category_split}
          xKey="category"
          xLabel="Category"
          series={[{ key: 'courses', label: 'Courses' }]}
        >
          <SimpleBarChart
            data={d.category_split}
            xKey="category"
            layout="vertical"
            series={[{ key: 'courses', label: 'Courses' }]}
            height={Math.max(160, d.category_split.length * 40)}
          />
        </ChartCard>
      </div>
    </div>
  );
}
