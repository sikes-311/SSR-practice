import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StockListItemResponse } from '@/types/stock';

vi.mock('@/hooks/use-stock-list', () => ({
  useStockList: vi.fn(),
}));

import { useStockList } from '@/hooks/use-stock-list';
import StocksPage from './page';

const mockStocks: StockListItemResponse[] = [
  {
    symbol: 'TOYOTA',
    name: 'トヨタ自動車',
    changePercentA: 1.6,
    changePercentB: 2.0,
    averageChangePercent: 1.8,
    priceDate: '2026-03-21',
  },
  {
    symbol: 'SONY',
    name: 'ソニーグループ',
    changePercentA: 1.4,
    changePercentB: 2.0,
    averageChangePercent: 1.7,
    priceDate: '2026-03-21',
  },
  {
    symbol: 'NINTENDO',
    name: '任天堂',
    changePercentA: -1.4,
    changePercentB: 2.0,
    averageChangePercent: 0.3,
    priceDate: '2026-03-21',
  },
];

describe('StocksPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('正常系: データ取得成功', () => {
    it('銘柄カード（data-testid="stock-list-card"）が表示される', async () => {
      // Arrange
      vi.mocked(useStockList).mockReturnValue({
        data: { stocks: mockStocks },
        isLoading: false,
        isError: false,
      } as any);

      // Act
      render(<StocksPage />);

      // Assert
      await waitFor(() => {
        const cards = screen.getAllByTestId('stock-list-card');
        expect(cards).toHaveLength(3);
      });
    });

    it('デフォルト（値上がり順）では最初のカードがトヨタ自動車になる', async () => {
      // Arrange
      vi.mocked(useStockList).mockReturnValue({
        data: { stocks: mockStocks },
        isLoading: false,
        isError: false,
      } as any);

      // Act
      render(<StocksPage />);

      // Assert
      const cards = screen.getAllByTestId('stock-list-card');
      expect(within(cards[0]).getByTestId('stock-list-name')).toHaveTextContent('トヨタ自動車');
      expect(within(cards[1]).getByTestId('stock-list-name')).toHaveTextContent('ソニーグループ');
      expect(within(cards[2]).getByTestId('stock-list-name')).toHaveTextContent('任天堂');
    });
  });

  describe('正常系: 並び替え', () => {
    it('sort-select で asc を選択すると表示順が逆になる（値下がり順）', async () => {
      // Arrange
      vi.mocked(useStockList).mockReturnValue({
        data: { stocks: mockStocks },
        isLoading: false,
        isError: false,
      } as any);

      render(<StocksPage />);

      // Act
      const select = screen.getByTestId('sort-select');
      await userEvent.selectOptions(select, 'asc');

      // Assert
      await waitFor(() => {
        const cards = screen.getAllByTestId('stock-list-card');
        expect(within(cards[0]).getByTestId('stock-list-name')).toHaveTextContent('任天堂');
        expect(within(cards[1]).getByTestId('stock-list-name')).toHaveTextContent('ソニーグループ');
        expect(within(cards[2]).getByTestId('stock-list-name')).toHaveTextContent('トヨタ自動車');
      });
    });
  });

  describe('ローディング状態', () => {
    it('isLoading が true のとき stock-list-loading が表示される', () => {
      // Arrange
      vi.mocked(useStockList).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as any);

      // Act
      render(<StocksPage />);

      // Assert
      expect(screen.getByTestId('stock-list-loading')).toBeInTheDocument();
      expect(screen.queryAllByTestId('stock-list-card')).toHaveLength(0);
    });
  });

  describe('異常系: エラー状態', () => {
    it('fetch がエラーを返したとき data-testid="stock-list-error" が表示される', () => {
      // Arrange
      vi.mocked(useStockList).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as any);

      // Act
      render(<StocksPage />);

      // Assert
      expect(screen.getByTestId('stock-list-error')).toBeInTheDocument();
      expect(screen.queryAllByTestId('stock-list-card')).toHaveLength(0);
    });

    it('エラーメッセージに適切なテキストが含まれる', () => {
      // Arrange
      vi.mocked(useStockList).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as any);

      // Act
      render(<StocksPage />);

      // Assert
      expect(screen.getByTestId('stock-list-error')).toHaveTextContent(
        '株価情報を取得できませんでした',
      );
    });
  });
});
