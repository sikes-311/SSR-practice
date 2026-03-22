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
