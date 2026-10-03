// Run after npm run build. The temporary server is stopped even if an assertion fails.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'http://127.0.0.1:34173';
const env = { ...process.env };
delete env.NEXT_PUBLIC_SUPABASE_URL;
delete env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '34173'], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', chunk => { output += chunk; });
server.stderr.on('data', chunk => { output += chunk; });
const request = (path, options = {}) => fetch(origin + path, { ...options, redirect: 'manual' });

try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw new Error('Test server exited: ' + output);
    try { if ((await request('/api/health')).ok) { ready = true; break; } } catch {}
    await delay(250);
  }
  assert.ok(ready, 'temporary production server becomes ready');
  const home = await request('/');
  assert.equal(home.status, 307);
  assert.ok(home.headers.get('location')?.endsWith('/login'));
  assert.match(home.headers.get('cache-control'), /no-store/);
  const login = await request('/login');
  assert.equal(login.status, 200);
  assert.match(await login.text(), /Wordnest đang được kết nối/);
  assert.equal((await request('/auth/signout')).status, 405);
  assert.equal((await request('/auth/signout', { method: 'POST' })).status, 403);
  assert.equal((await request('/auth/signout', { method: 'POST', headers: { origin: 'https://attacker.invalid' } })).status, 403);
  const signout = await request('/auth/signout', { method: 'POST', headers: { origin } });
  assert.equal(signout.status, 303);
  assert.equal(new URL(signout.headers.get('location'), origin).href, origin + '/login');
  const confirm = await request('/auth/confirm?next=https://attacker.invalid&token_hash=invalid&type=email');
  assert.equal(confirm.status, 303);
  assert.equal(new URL(confirm.headers.get('location'), origin).href, origin + '/login?error=confirmation');
  assert.match(confirm.headers.get('cache-control'), /no-store/);
  assert.equal(confirm.headers.get('referrer-policy'), 'no-referrer');
  console.log('Auth production smoke passed: configuration notice, protected home, noncached auth, signout CSRF and fixed confirmation redirect.');
} finally {
  server.kill();
  await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
}
