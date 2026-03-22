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

import { createServer } from 'http';

// ---- State ----
let serviceAError = false;
let serviceBError = false;

// ---- Helper ----
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// ---- Mock data ----
const mockDataA = {
  popularStocks: {
    stocks: [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 189.50, change_percent: 1.25, price_date: '2026-03-21' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 175.30, change_percent: -0.45, price_date: '2026-03-21' },
      { symbol: 'MSFT', name: 'Microsoft Corp.', price: 425.80, change_percent: 0.78, price_date: '2026-03-21' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 198.20, change_percent: 2.10, price_date: '2026-03-21' },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.60, change_percent: -1.30, price_date: '2026-03-21' },
    ],
  },
};

const mockDataB = {
  // Feature-specific mock data をここに追加する
};

// ---- Router ----
function createMockService(port, mockData, getErrorState, setErrorState) {
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // Admin endpoints for error mode control
    if (req.method === 'POST' && req.url === '/admin/force-error') {
      setErrorState(true);
      res.writeHead(200);
      res.end(JSON.stringify({ message: 'Error mode enabled' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/admin/clear-error') {
      setErrorState(false);
      res.writeHead(200);
      res.end(JSON.stringify({ message: 'Error mode cleared' }));
      return;
    }

    // Health check
    if (req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', port }));
      return;
    }

    // POST /auth/login — 認証エンドポイント（エラーモードの影響を受けない）
    if (req.method === 'POST' && req.url === '/auth/login') {
      try {
        const body = await parseBody(req);
        if (body.password === 'wrongpassword') {
          res.writeHead(401);
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ sessionId: 'mock-session-id-abc123' }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Bad Request' }));
      }
      return;
    }

    // Error mode
    if (getErrorState()) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal Server Error (forced)' }));
      return;
    }

    // GET /stocks/popular — 人気銘柄データ
    if (req.method === 'GET' && req.url === '/stocks/popular') {
      res.writeHead(200);
      res.end(JSON.stringify(mockData.popularStocks));
      return;
    }

    // 404 fallback
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(port, () => {
    console.log(`Mock Service ${port === 4001 ? 'A' : 'B'} running on http://localhost:${port}`);
  });

  return server;
}

createMockService(
  4001,
  mockDataA,
  () => serviceAError,
  (v) => { serviceAError = v; },
);

createMockService(
  4002,
  mockDataB,
  () => serviceBError,
  (v) => { serviceBError = v; },
);
