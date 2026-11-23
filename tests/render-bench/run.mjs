// Drives tests/render-bench in headless Edge/Chrome over CDP.
// Usage: node tests/render-bench/run.mjs [baseUrl] [casesJson]
// Needs the Vite dev server running (npm run dev).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.argv[2] || 'http://localhost:5173';
const cases = process.argv[3] ? JSON.parse(process.argv[3]) : [
  { impl: 'baseline', srcFps: 60 },
  { impl: 'current', srcFps: 60 },
  { impl: 'baseline', srcFps: 30 },
  { impl: 'current', srcFps: 30 },
];

const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const exe = browsers.find((p) => existsSync(p));
if (!exe) throw new Error('No Chromium browser found');

const port = 9333;
const profile = mkdtempSync(join(tmpdir(), 'videofy-bench-'));
const proc = spawn(exe, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
  } catch {}
}
if (!target) { proc.kill(); throw new Error('CDP not reachable'); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    console.error('[page]', msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: `${base}/tests/render-bench/index.html` });
for (let i = 0; i < 100; i++) {
  await sleep(200);
  const r = await send('Runtime.evaluate', { expression: 'typeof window.runBench === "function" && !!window.__mp4box', returnByValue: true });
  if (r.result?.result?.value) break;
}

const rows = [];
for (const c of cases) {
  const r = await send('Runtime.evaluate', {
    expression: c.sample ? `runSampleCut(${JSON.stringify(c)})` : `runBench(${JSON.stringify(c)})`, awaitPromise: true, returnByValue: true, timeout: 600000,
  });
  if (r.result?.exceptionDetails) {
    rows.push({ ...c, error: r.result.exceptionDetails.exception?.description?.split('\n')[0] });
  } else {
    rows.push(r.result.result.value);
  }
  console.log(JSON.stringify(rows[rows.length - 1]));
}

ws.close();
proc.kill();
