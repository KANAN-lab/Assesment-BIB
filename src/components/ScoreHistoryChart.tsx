import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';
import type { ScoreHistoryEntry } from '../types/assessment';

interface ScoreHistoryChartProps {
  history: ScoreHistoryEntry[];
  currentBibScore: number;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-zinc-400 mb-1">{label}</div>
      <div className="text-emerald-400 font-bold">BIB: {Number(payload[0]?.value).toFixed(1)}</div>
      {payload[1] && (
        <div className="text-indigo-400 font-semibold">Poin: {payload[1]?.value}</div>
      )}
    </div>
  );
};

export const ScoreHistoryChart: React.FC<ScoreHistoryChartProps> = ({ history, currentBibScore }) => {
  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    return history.map((entry) => ({
      date: formatDate(entry.recordedAt),
      bib: entry.bibScore,
      points: entry.totalPoints,
    }));
  }, [history]);

  const trend = useMemo(() => {
    if (history.length < 2) return 'neutral';
    const first = history[0].bibScore;
    const last = history[history.length - 1].bibScore;
    if (last > first + 1) return 'up';
    if (last < first - 1) return 'down';
    return 'neutral';
  }, [history]);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-zinc-400';

  if (history.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Tren Skor BIB</h3>
        </div>
        <div className="flex items-center justify-center h-24 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          Belum ada data historis. Selesaikan kuis atau checklist untuk mulai merekam tren.
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Tren Skor BIB</h3>
          <span className="text-zinc-500 text-xs font-normal">({history.length} rekaman)</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          {trend === 'up' ? 'Meningkat' : trend === 'down' ? 'Menurun' : 'Stabil'}
        </div>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="bibGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#71717a', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#71717a', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="bib"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#bibGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-400">Skor BIB Saat Ini</div>
        <div className="text-sm font-black text-emerald-400">{currentBibScore.toFixed(1)}</div>
      </div>
    </div>
  );
};
