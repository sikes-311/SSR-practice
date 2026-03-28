import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StockChartViewer } from './stock-chart-viewer';

vi.mock('@/hooks/use-stock-chart', () => ({
  useStockChart: vi.fn(),
}));

import { useStockChart } from '@/hooks/use-stock-chart';

describe('StockChartViewer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('正常系: デフォルトで6ヶ月ボタンが aria-pressed="true" になっている', () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStockChart>);

    // Act
    render(<StockChartViewer symbol="AAPL" />);

    // Assert
    expect(screen.getByTestId('period-button-6m')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('period-button-1y')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('period-button-2y')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('period-button-10y')).toHaveAttribute('aria-pressed', 'false');
  });

  it('正常系: 期間ボタンをクリックすると aria-pressed 状態が切り替わる', async () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStockChart>);
    const user = userEvent.setup();

    // Act
    render(<StockChartViewer symbol="AAPL" />);
    await user.click(screen.getByTestId('period-button-1y'));

    // Assert
    expect(screen.getByTestId('period-button-1y')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('period-button-6m')).toHaveAttribute('aria-pressed', 'false');
  });

  it('正常系: 期間ボタンクリックで useStockChart に新しい period が渡される', async () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStockChart>);
    const user = userEvent.setup();

    // Act
    render(<StockChartViewer symbol="AAPL" />);
    await user.click(screen.getByTestId('period-button-2y'));

    // Assert
    expect(useStockChart).toHaveBeenLastCalledWith('AAPL', '2y');
  });

  it('正常系: isLoading 時に「読み込み中...」が表示される', () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useStockChart>);

    // Act
    render(<StockChartViewer symbol="AAPL" />);

    // Assert
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('異常系: isError 時に chart-error が表示され「現在チャートを表示できません。」が含まれる', () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useStockChart>);

    // Act
    render(<StockChartViewer symbol="AAPL" />);

    // Assert
    const errorEl = screen.getByTestId('chart-error');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent('現在チャートを表示できません。');
  });

  it('異常系: isError 時にチャートは表示されない', () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useStockChart>);

    // Act
    render(<StockChartViewer symbol="AAPL" />);

    // Assert
    expect(screen.queryByTestId('stock-chart')).not.toBeInTheDocument();
  });

  it('正常系: data がある場合に stock-chart が表示される', () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: {
        symbol: 'AAPL',
        prices: [
          { date: '2025-09-27', price: 172.5 },
          { date: '2025-10-27', price: 175.0 },
        ],
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStockChart>);

    // Act
    render(<StockChartViewer symbol="AAPL" />);

    // Assert
    expect(screen.getByTestId('stock-chart')).toBeInTheDocument();
  });
});
