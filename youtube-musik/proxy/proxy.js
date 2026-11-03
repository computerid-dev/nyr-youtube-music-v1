const home = require('../backend/home');
const search = require('../backend/search');
const stream = require('../backend/stream');
const album = require('../backend/album');

const routes = { '/api/home': home, '/api/search': search, '/api/stream': stream, '/api/album': album };

const PIN_HOST = process.env.PIN_HOST || 'nyr-youtube-music-v1.vercel.app';
// localhost hanya sementara untuk tes; dihapus saat "SIAP DEPLOY".
const allowedHosts = () => [PIN_HOST, 'localhost', '127.0.0.1'];

module.exports = (req, res) => {
  const host = String(req.headers.host || '').split(':')[0];
  if (!allowedHosts().includes(host)) {
    res.statusCode = 403;
    return res.end('link tidak resmi! Tidak dapat dibuka!');
  }
  const handler = routes[new URL(req.url, 'http://localhost').pathname];
  if (!handler) {
    res.statusCode = 404;
    return res.end('Endpoint tidak ditemukan.');
  }
  return handler(req, res);
};
