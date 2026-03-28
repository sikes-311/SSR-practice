/**
 * Downstream モックサーバー
 *
 * E2E テスト用の外部 API モック。Next.js とは別プロセスで起動する。
 *
 * 起動: node mock-server.mjs
 *   Service A: http://localhost:4001
 *   Service B: http://localhost:4002
 *
 * エラーモード制御:
 *   POST /admin/force-error  → エラーモードに切替
 *   POST /admin/clear-error  → エラーモード解除
 */

import { createServer } from "http";

// ---- State ----
let serviceAError = false;
let serviceBError = false;

// ---- Helper ----
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

// ---- Mock data ----
const mockDataA = {
  allStocks: {
    stocks: [
      { symbol: "TOYOTA",   name: "トヨタ自動車",   change_percent: 1.6,  price_date: "2026-03-21" },
      { symbol: "SONY",     name: "ソニーグループ",  change_percent: 1.4,  price_date: "2026-03-21" },
      { symbol: "NINTENDO", name: "任天堂",          change_percent: -1.4, price_date: "2026-03-21" },
    ],
  },
  popularStocks: {
    stocks: [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 189.5,
        change_percent: 1.25,
        price_date: "2026-03-21",
      },
      {
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        price: 175.3,
        change_percent: -0.45,
        price_date: "2026-03-21",
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corp.",
        price: 425.8,
        change_percent: 0.78,
        price_date: "2026-03-21",
      },
      {
        symbol: "AMZN",
        name: "Amazon.com Inc.",
        price: 198.2,
        change_percent: 2.1,
        price_date: "2026-03-21",
      },
      {
        symbol: "NVDA",
        name: "NVIDIA Corp.",
        price: 875.6,
        change_percent: -1.3,
        price_date: "2026-03-21",
      },
    ],
  },
};

const mockDataB = {
  allStocks: {
    stocks: [
      { symbol: "TOYOTA",   change_percent: 2.0, price_date: "2026-03-21" },
      { symbol: "SONY",     change_percent: 2.0, price_date: "2026-03-21" },
      { symbol: "NINTENDO", change_percent: 2.0, price_date: "2026-03-21" },
    ],
  },
};

// ---- Chart base prices ----
const chartBasePrices = {
  A: {
    AAPL:     170,
    GOOGL:    160,
    MSFT:     400,
    AMZN:     180,
    NVDA:     800,
    TOYOTA:   1900,
    SONY:     1500,
    NINTENDO: 5000,
  },
  B: {
    AAPL:     180,
    GOOGL:    165,
    MSFT:     410,
    AMZN:     195,
    NVDA:     850,
    TOYOTA:   2000,
    SONY:     1600,
    NINTENDO: 5200,
  },
};

/**
 * from〜to の範囲で月次データポイントを動的生成する。
 * 各ポイントには +5〜+10/月 の増分を加算してトレンドを再現する。
 */
function generateMonthlyChartData(symbol, service, from, to) {
  const basePriceMap = chartBasePrices[service];
  const basePrice = basePriceMap[symbol] ?? 100;

  const fromDate = new Date(from);
  const toDate = new Date(to);
  const prices = [];

  let current = new Date(fromDate);
  let index = 0;

  while (current <= toDate) {
    const increment = index * (5 + (index % 2) * 5); // 5 or 10 per month
    prices.push({
      date: current.toISOString().slice(0, 10),
      price: Math.round((basePrice + increment) * 100) / 100,
    });
    current = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, current.getUTCDate()));
    index++;
  }

  return { prices };
}

// ---- Router ----
function createMockService(port, mockData, getErrorState, setErrorState) {
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    // Admin endpoints for error mode control
    if (req.method === "POST" && req.url === "/admin/force-error") {
      setErrorState(true);
      res.writeHead(200);
      res.end(JSON.stringify({ message: "Error mode enabled" }));
      return;
    }

    if (req.method === "POST" && req.url === "/admin/clear-error") {
      setErrorState(false);
      res.writeHead(200);
      res.end(JSON.stringify({ message: "Error mode cleared" }));
      return;
    }

    // Health check
    if (req.url === "/health") {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "ok", port }));
      return;
    }

    // POST /auth/login — 認証エンドポイント（エラーモードの影響を受けない）
    if (req.method === "POST" && req.url === "/auth/login") {
      try {
        const body = await parseBody(req);
        if (body.password === "wrongpassword") {
          res.writeHead(401);
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ sessionId: "mock-session-id-abc123" }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Bad Request" }));
      }
      return;
    }

    // Error mode
    if (getErrorState()) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal Server Error (forced)" }));
      return;
    }

    // GET /stocks — 全銘柄データ
    if (req.method === "GET" && req.url === "/stocks") {
      res.writeHead(200);
      res.end(JSON.stringify(mockData.allStocks));
      return;
    }

    // GET /stocks/popular — 人気銘柄データ
    if (req.method === "GET" && req.url === "/stocks/popular") {
      res.writeHead(200);
      res.end(JSON.stringify(mockData.popularStocks));
      return;
    }

    // GET /stocks/:symbol/chart?from=YYYY-MM-DD&to=YYYY-MM-DD — チャートデータ
    const chartMatch = req.url?.match(/^\/stocks\/([^/?]+)\/chart(\?.*)?$/);
    if (req.method === "GET" && chartMatch) {
      const symbol = chartMatch[1].toUpperCase();
      const searchParams = new URLSearchParams(chartMatch[2]?.slice(1) ?? "");
      const from = searchParams.get("from") ?? "2025-09-27";
      const to = searchParams.get("to") ?? "2026-03-27";
      const service = port === 4001 ? "A" : "B";
      res.writeHead(200);
      res.end(JSON.stringify(generateMonthlyChartData(symbol, service, from, to)));
      return;
    }

    // 404 fallback
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found" }));
  });

  server.listen(port, () => {
    console.log(
      `Mock Service ${port === 4001 ? "A" : "B"} running on http://localhost:${port}`,
    );
  });

  return server;
}

createMockService(
  4001,
  mockDataA,
  () => serviceAError,
  (v) => {
    serviceAError = v;
  },
);

createMockService(
  4002,
  mockDataB,
  () => serviceBError,
  (v) => {
    serviceBError = v;
  },
);
