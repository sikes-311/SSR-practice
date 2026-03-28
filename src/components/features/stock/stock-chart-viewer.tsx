'use client';

import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStockChart } from '@/hooks/use-stock-chart';

type PeriodKey = '6m' | '1y' | '2y' | '10y';

const periods: { key: PeriodKey; label: string }[] = [
  { key: '6m', label: '6ヶ月' },
  { key: '1y', label: '1年' },
  { key: '2y', label: '2年' },
  { key: '10y', label: '10年' },
];

function formatTick(date: string, period: PeriodKey): string {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  if (period === '10y') {
    return `${yyyy}`;
  }
  return `${yyyy}/${mm}`;
}

function getTickInterval(period: PeriodKey): number {
  switch (period) {
    case '6m':
      return 1;
    case '1y':
      return 2;
    case '2y':
      return 4;
    case '10y':
      return 12;
  }
}

type Props = {
  symbol: string;
};

export function StockChartViewer({ symbol }: Props) {
  const [period, setPeriod] = useState<PeriodKey>('6m');
  const { data, isLoading, isError } = useStockChart(symbol, period);

  const tickInterval = getTickInterval(period);

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            data-testid={`period-button-${p.key}`}
            aria-pressed={period === p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded px-4 py-2 text-sm font-medium ${
              period === p.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-gray-500">読み込み中...</p>}

      {isError && (
        <p data-testid="chart-error" className="text-red-600">
          現在チャートを表示できません。
        </p>
      )}

      {data && data.prices.length > 0 && (
        <div data-testid="stock-chart" className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.prices} margin={{ right: 32 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date: string) => formatTick(date, period)}
                interval={tickInterval - 1}
              />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip
                labelFormatter={(label) => String(label)}
                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
              />
              <Line type="monotone" dataKey="price" stroke="#2563eb" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
