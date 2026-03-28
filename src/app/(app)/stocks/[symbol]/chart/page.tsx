import { StockChartViewer } from '@/components/features/stock/stock-chart-viewer';

type Props = {
  params: Promise<{ symbol: string }>;
};

export default async function StockChartPage({ params }: Props) {
  const { symbol } = await params;

  return (
    <div data-testid="stock-chart-page" className="flex flex-1 flex-col px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{symbol} 株価チャート</h1>
      <StockChartViewer symbol={symbol} />
    </div>
  );
}
