export type StockResponse = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  priceDate: string;
};

export type PopularStocksResponse = {
  stocks: StockResponse[];
};

export type StockListItemResponse = {
  symbol: string;
  name: string;
  changePercentA: number;
  changePercentB: number;
  averageChangePercent: number;
  priceDate: string;
};

export type StockListResponse = {
  stocks: StockListItemResponse[];
};

export type StockChartDataPoint = {
  date: string; // "YYYY-MM-DD"
  price: number;
};

export type StockChartResponse = {
  symbol: string;
  prices: StockChartDataPoint[];
};
