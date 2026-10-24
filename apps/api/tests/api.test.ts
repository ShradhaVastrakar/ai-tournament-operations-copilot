// Tests for GET /api/health and GET /api/matches using node:test (no external test framework).
// Run with: node --test tests/

import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import * as http from 'node:http';
import * as net from 'node:net';

// Set required env vars before importing app
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.AI_SERVICE_URL = 'http://localhost:8000';
process.env.PORT = '0'; // use random port

// Dynamically import app after env is set
let server: http.Server;
let baseUrl: string;

before(async () => {
  const appModule = await import('../src/app');
  const app = appModule.default;

  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as net.AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(() => new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))));

async function get(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${baseUrl}${path}`);
  return { status: res.status, body: await res.json() };
}

test('GET /api/health returns 200 with status ok', async () => {
  const { status, body } = await get('/api/health');
  assert.equal(status, 200);
  assert.equal((body as { success: boolean }).success, true);
  assert.equal((body as { data: { status: string } }).data.status, 'ok');
});

test('GET /api/matches returns 200 with an array', async () => {
  const { status, body } = await get('/api/matches');
  assert.equal(status, 200);
  assert.ok(Array.isArray((body as { data: unknown[] }).data));
});

test('GET /api/matches?status=completed filters correctly', async () => {
  const { status, body } = await get('/api/matches?status=completed');
  assert.equal(status, 200);
  const matches = (body as { data: { status: string }[] }).data;
  assert.ok(matches.every((m) => m.status === 'completed'));
});

test('GET /api/matches?status=invalid returns 400', async () => {
  const { status } = await get('/api/matches?status=invalid');
  assert.equal(status, 400);
});

test('GET /api/health — unknown route returns 404', async () => {
  const { status } = await get('/api/does-not-exist');
  assert.equal(status, 404);
});
