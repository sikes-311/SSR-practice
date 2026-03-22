import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StockResponse } from '@/types/stock';
import { StockCard } from './stock-card';

const baseStock: StockResponse = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 12345.6,
  changePercent: 2.35,
  priceDate: '2026-03-22',
};

describe('StockCard', () => {
  it('正常系: 各フィールドが正しく表示される', () => {
    // Arrange & Act
    render(<StockCard stock={baseStock} />);

    // Assert
    expect(screen.getByTestId('stock-symbol')).toHaveTextContent('AAPL');
    expect(screen.getByTestId('stock-name')).toHaveTextContent('Apple Inc.');
    expect(screen.getByTestId('stock-price')).toHaveTextContent('$12,345.60');
    expect(screen.getByTestId('stock-price-date')).toHaveTextContent('2026-03-22');
  });

  it('正常系: changePercent が正の場合は「+」符号・緑色で表示される', () => {
    // Arrange
    const stock: StockResponse = { ...baseStock, changePercent: 1.5 };

    // Act
    render(<StockCard stock={stock} />);

    // Assert
    const el = screen.getByTestId('stock-change-percent');
    expect(el).toHaveTextContent('+1.50%');
    expect(el).toHaveClass('text-green-600');
  });

  it('正常系: changePercent が 0 の場合は「+」符号・緑色で表示される', () => {
    // Arrange
    const stock: StockResponse = { ...baseStock, changePercent: 0 };

    // Act
    render(<StockCard stock={stock} />);

    // Assert
    const el = screen.getByTestId('stock-change-percent');
    expect(el).toHaveTextContent('+0.00%');
    expect(el).toHaveClass('text-green-600');
  });

  it('正常系: changePercent が負の場合は「-」符号・赤色で表示される', () => {
    // Arrange
    const stock: StockResponse = { ...baseStock, changePercent: -3.21 };

    // Act
    render(<StockCard stock={stock} />);

    // Assert
    const el = screen.getByTestId('stock-change-percent');
    expect(el).toHaveTextContent('-3.21%');
    expect(el).toHaveClass('text-red-600');
  });

  it('正常系: 各 data-testid が存在する', () => {
    // Arrange & Act
    render(<StockCard stock={baseStock} />);

    // Assert
    expect(screen.getByTestId('stock-card')).toBeInTheDocument();
    expect(screen.getByTestId('stock-symbol')).toBeInTheDocument();
    expect(screen.getByTestId('stock-name')).toBeInTheDocument();
    expect(screen.getByTestId('stock-price')).toBeInTheDocument();
    expect(screen.getByTestId('stock-change-percent')).toBeInTheDocument();
    expect(screen.getByTestId('stock-price-date')).toBeInTheDocument();
  });
});
