import { useEffect, useState, type ReactNode } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { useUiStore } from '@/store/uiStore';

/** Reads chart tokens from CSS so charts follow light/dark mode. */
export function useChartTheme() {
  const theme = useUiStore((s) => s.theme);
  const read = () => {
    const cs = getComputedStyle(document.documentElement);
    const rgbVar = (n: string) => `rgb(${cs.getPropertyValue(`--${n}`).trim().split(' ').join(',')})`;
    return {
      s1: cs.getPropertyValue('--series-1').trim() || '#2a78d6',
      s2: cs.getPropertyValue('--series-2').trim() || '#eb6834',
      grid: rgbVar('line'),
      axis: rgbVar('ink-faint'),
      surface: rgbVar('surface'),
    };
  };
  const [c, setC] = useState(read);
  useEffect(() => {
    const id = requestAnimationFrame(() => setC(read()));
    const obs = new MutationObserver(() => setC(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      cancelAnimationFrame(id);
      obs.disconnect();
    };
  }, [theme]);
  return c;
}

type Row = Record<string, string | number>;
export interface SeriesDef {
  key: string;
  label: string;
  format?: (v: number) => string;
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
}: TooltipProps<number, string> & { series: SeriesDef[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((p) => {
        const def = series.find((s) => s.key === p.dataKey);
        return (
          <p key={String(p.dataKey)} className="flex items-center gap-2 text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
            {def?.label}:{' '}
            <span className="font-medium tabular-nums text-ink">
              {def?.format ? def.format(Number(p.value)) : p.value}
            </span>
          </p>
        );
      })}
    </div>
  );
}

/** Card wrapper with a chart ⇄ table toggle so no figure is colour-only (a11y). */
export function ChartCard({
  title,
  subtitle,
  data,
  xKey,
  xLabel,
  series,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  data: Row[];
  xKey: string;
  xLabel: string;
  series: SeriesDef[];
  children: ReactNode;
  className?: string;
}) {
  const [table, setTable] = useState(false);
  return (
    <section className={`panel p-5 ${className ?? ''}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
        </div>
        <button
          className="btn-ghost p-1.5"
          onClick={() => setTable((t) => !t)}
          aria-pressed={table}
          aria-label={table ? 'Show chart' : 'Show as table'}
          title={table ? 'Show chart' : 'Show as table'}
        >
          {table ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
        </button>
      </div>
      {table ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs text-ink-soft">
              <tr>
                <th className="py-1.5 pr-3 font-medium">{xLabel}</th>
                {series.map((s) => (
                  <th key={s.key} className="py-1.5 pr-3 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((r, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-3">{r[xKey]}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1.5 pr-3 text-right tabular-nums">
                      {s.format ? s.format(Number(r[s.key])) : r[s.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

const axisProps = (color: string) => ({
  tick: { fill: color, fontSize: 12 },
  tickLine: false,
  axisLine: false,
});
const compact = (v: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

export function SimpleBarChart({
  data,
  xKey,
  series,
  height = 260,
  layout = 'horizontal',
  yMax,
}: {
  data: Row[];
  xKey: string;
  series: SeriesDef[];
  height?: number;
  layout?: 'horizontal' | 'vertical';
  yMax?: number;
}) {
  const c = useChartTheme();
  const colors = [c.s1, c.s2];
  const vertical = layout === 'vertical';
  return (
    <div role="img" aria-label={`Bar chart of ${series.map((s) => s.label).join(' and ')} by ${xKey}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 4, right: 8, left: vertical ? 8 : -12, bottom: 0 }}
          barGap={2}
          barCategoryGap="28%"
        >
          <CartesianGrid stroke={c.grid} strokeDasharray="0" vertical={vertical} horizontal={!vertical} />
          {vertical ? (
            <>
              <XAxis
                type="number"
                {...axisProps(c.axis)}
                domain={[0, yMax ?? 'auto']}
                allowDecimals={false}
                tickFormatter={compact}
              />
              <YAxis type="category" dataKey={xKey} {...axisProps(c.axis)} width={140} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} {...axisProps(c.axis)} interval={0} />
              <YAxis
                {...axisProps(c.axis)}
                domain={[0, yMax ?? 'auto']}
                allowDecimals={false}
                tickFormatter={compact}
              />
            </>
          )}
          <Tooltip cursor={{ fill: c.grid, opacity: 0.4 }} content={<ChartTooltip series={series} />} />
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 12, color: c.axis }} iconType="circle" iconSize={8} />
          )}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={colors[i]}
              radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleLineChart({
  data,
  xKey,
  series,
  height = 260,
}: {
  data: Row[];
  xKey: string;
  series: SeriesDef[];
  height?: number;
}) {
  const c = useChartTheme();
  const colors = [c.s1, c.s2];
  return (
    <div role="img" aria-label={`Line chart of ${series.map((s) => s.label).join(' and ')} over ${xKey}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey={xKey} {...axisProps(c.axis)} minTickGap={24} />
          <YAxis {...axisProps(c.axis)} allowDecimals={false} tickFormatter={compact} />
          <Tooltip
            cursor={{ stroke: c.axis, strokeDasharray: '3 3' }}
            content={<ChartTooltip series={series} />}
          />
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 12, color: c.axis }} iconType="circle" iconSize={8} />
          )}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colors[i]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
