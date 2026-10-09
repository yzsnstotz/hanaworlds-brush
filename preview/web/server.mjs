import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {compilePreview} from '../compile.mjs';

const host = '127.0.0.1', port = 47602, origin = `http://${host}:${port}`;
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/bootstrap.js', ['bootstrap.js', 'text/javascript; charset=utf-8']],
  ['/client.cjs', ['../client.cjs', 'text/javascript; charset=utf-8']],
  ['/react.js', ['node_modules/react/umd/react.production.min.js', 'text/javascript; charset=utf-8']],
  ['/react-dom.js', ['node_modules/react-dom/umd/react-dom.production.min.js', 'text/javascript; charset=utf-8']]
]);
// Read this deployment's static bytes before listening. A missing dependency
// must fail startup, and removing a runtime file must not blank an active page.
const resources = new Map(await Promise.all([...assets].map(async ([route, [file, type]]) =>
  [route, {type, bytes: await readFile(new URL(file, import.meta.url))}]
)));
function json(res, status, value) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(value));
}
const server = createServer(async (req, res) => {
  // 127.0.0.1 and localhost both name this machine; anything else is refused (DNS rebinding).
  const okHosts = [`${host}:${port}`, `localhost:${port}`];
  if (!okHosts.includes(req.headers.host) || (req.headers.origin && !okHosts.map(h => `http://${h}`).includes(req.headers.origin))) {
    json(res, 403, {ok: false, error: {message: '请从本机 Brush 网页编译。'}}); return;
  }
  // Any page path that is not an asset or the API shows the page itself, so a copied link with trailing text still opens.
  let path = new URL(req.url, origin).pathname;
  if (req.method === 'GET' && !resources.has(path) && !path.startsWith('/api/')) path = '/';
  if (req.method === 'GET' && resources.has(path)) {
    const {bytes, type} = resources.get(path);
    res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'});
    res.end(bytes);
    return;
  }
  if (req.method !== 'POST' || path !== '/api/compile') {
    json(res, 404, {ok: false, error: {message: '没有这个网页入口。'}}); return;
  }
  if (!req.headers['content-type']?.startsWith('application/json')) {
    json(res, 415, {ok: false, error: {message: '编译输入需要 JSON。'}}); return;
  }
  let input;
  try {
    let body = ''; for await (const chunk of req) body += chunk;
    input = JSON.parse(body);
  } catch {
    json(res, 400, {ok: false, error: {message: '编译输入不是有效 JSON。'}}); return;
  }
  try {
    json(res, 200, {ok: true, value: compilePreview(input)});
  } catch (error) {
    console.error('Brush 编译失败', error);
    json(res, 500, {ok: false, error: {message: '本机编译失败，请检查服务日志。'}});
  }
});
server.on('error', error => { console.error(error); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Brush preview ready: ${origin}/ · Node ${process.version} · Brush 0.5.3 · FIXTURE`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close());
