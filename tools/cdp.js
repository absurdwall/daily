// Minimal Chrome DevTools Protocol helper (no npm deps). Node 20: run with --experimental-websocket.
// const {launch} = require('./cdp.js'); const b = await launch({width,height,mobile}); await b.goto(url); ...
const {spawn} = require('child_process');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function launch({width = 1280, height = 900, mobile = false, scale = 1, port = 9300 + Math.floor(Math.random() * 500)} = {}) {
  const dir = fs.mkdtempSync('/tmp/cdp-');
  const proc = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${width},${height}`, '--hide-scrollbars', 'about:blank'], {stdio: 'ignore'});
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.find(t => t.type === 'page')) break; } catch (e) {} await sleep(200); }
  const page = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = {}; const events = [];
  const logs = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } else events.push(d);
    if (d.method === 'Runtime.exceptionThrown') logs.push({type: 'exception', text: d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description : d.params.exceptionDetails.text});
    if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'warning')) logs.push({type: d.params.type, text: d.params.args.map(a => a.value || a.description).join(' ')});
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') logs.push({type: 'log', text: d.params.entry.text + ' ' + (d.params.entry.url || '')});
    if (d.method === 'Network.responseReceived' && d.params.response.status >= 400) logs.push({type: 'http', text: d.params.response.status + ' ' + d.params.response.url});
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: scale, mobile});
  const api = {
    send, logs,
    async goto(url, wait = 3000) { await send('Page.navigate', {url}); await sleep(wait); },
    async eval(expr) { const r = await send('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); return r.result && r.result.result ? r.result.result.value : r; },
    async shot(path, full = false) {
      let params = {format: 'png'};
      if (full) { const h = await api.eval('document.documentElement.scrollHeight'); params = {format: 'png', captureBeyondViewport: true, clip: {x: 0, y: 0, width, height: h, scale: 1}}; }
      const r = await send('Page.captureScreenshot', params); fs.writeFileSync(path, Buffer.from(r.result.data, 'base64'));
    },
    async close() { try { ws.close(); } catch (e) {} proc.kill('SIGKILL'); },
    sleep
  };
  return api;
}
module.exports = {launch, sleep};
