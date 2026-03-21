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

// ---- Mock data ----
const mockDataA = {
  // Feature-specific mock data をここに追加する
};

const mockDataB = {
  // Feature-specific mock data をここに追加する
};

// ---- Router ----
function createMockService(port, mockData, getErrorState, setErrorState) {
  const server = createServer((req, res) => {
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

    // Error mode
    if (getErrorState()) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal Server Error (forced)' }));
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
