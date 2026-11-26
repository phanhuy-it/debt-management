import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';

test('serverless handler routes API, checks origin and enforces shared login limit', async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
  process.env.APP_PASSWORD = 'test-password-at-least-20-characters';
  process.env.FRONTEND_ORIGIN = 'https://staging.example.test';
  process.env.VERCEL = '1';
  const { default: handler } = await import('../api/[...path].js');
  const { pool } = await import('./app.js');
  const calls = [];
  let attempts = 0;
  let sessionHash;
  pool.query = async (sql, params = []) => {
    calls.push(sql);
    if (sql.includes('INSERT INTO public.debt_app_login_attempts')) {
      attempts++;
      return { rows: [{ attempts }] };
    }
    if (sql.includes('DELETE FROM public.debt_app_login_attempts WHERE client_hash')) attempts = 0;
    if (sql.includes('INSERT INTO public.debt_app_sessions')) sessionHash = params[0];
    if (sql.includes('SELECT 1 FROM public.debt_app_sessions')) return { rowCount: params[0] === sessionHash ? 1 : 0 };
    if (sql.includes('DELETE FROM public.debt_app_sessions WHERE token_hash')) sessionHash = undefined;
    return { rows: [], rowCount: 0 };
  };
  const server = createServer(handler).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const origin = process.env.FRONTEND_ORIGIN;
  const login = password => fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ password })
  });
  try {
    let response = await fetch(`${base}/api/auth/session`);
    assert.equal(response.status, 401);
    response = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { origin: 'https://other.example.test', 'content-type': 'application/json' },
      body: JSON.stringify({ password: process.env.APP_PASSWORD })
    });
    assert.equal(response.status, 403);
    assert.equal(attempts, 0);
    response = await login(process.env.APP_PASSWORD);
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=Strict/i);
    const sessionCookie = cookie.split(';')[0];
    response = await fetch(`${base}/api/auth/session`, { headers: { cookie: sessionCookie } });
    assert.equal(response.status, 200);
    response = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { origin, cookie: sessionCookie } });
    assert.equal(response.status, 200);
    response = await fetch(`${base}/api/auth/session`, { headers: { cookie: sessionCookie } });
    assert.equal(response.status, 401);
    for (let i = 0; i < 10; i++) assert.equal((await login('wrong')).status, 401);
    assert.equal((await login(process.env.APP_PASSWORD)).status, 429);
    assert.ok(calls.some(sql => sql.includes('ON CONFLICT (client_hash) DO UPDATE')));
  } finally {
    server.close();
    await once(server, 'close');
    await pool.end();
  }
});
