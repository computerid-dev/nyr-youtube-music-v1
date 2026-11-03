const http = require('http');
const fs = require('fs');
const path = require('path');
const proxy = require('./proxy/proxy');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..');
const BLOCKED = ['backend', 'proxy', 'node_modules', 'server.js'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) return proxy(req, res);

  const file = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  const allowed = file.startsWith(ROOT) && !BLOCKED.some((name) => file.includes(name));
  if (!allowed || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    return res.end('Tidak ditemukan');
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`YOUTUBE MUSIK jalan di http://localhost:${PORT}`));
