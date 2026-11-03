const axios = require('axios');
const { ytm, remember } = require('./client');

const USER_AGENTS = {
  IOS: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)',
  ANDROID_VR: 'com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip'
};
const DEFAULT_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function pickAudio(formats) {
  const audio = formats.filter((f) => /^audio\//.test(f.mimeType || '') && f.url);
  const byBitrate = (a, b) => (b.bitrate || 0) - (a.bitrate || 0);
  // m4a diprioritaskan karena didukung semua browser, termasuk Safari
  const m4a = audio.filter((f) => /audio\/mp4/.test(f.mimeType)).sort(byBitrate);
  return m4a[0] || audio.sort(byBitrate)[0] || null;
}

async function resolveSource(id) {
  return remember(`stream:${id}`, 20 * 60 * 1000, async () => {
    const probe = await ytm.probePlayer(id);
    const format = probe && pickAudio(probe.formats);
    if (!format) throw new Error('no-audio');
    return {
      url: format.url,
      mime: (format.mimeType || 'audio/mp4').split(';')[0],
      userAgent: USER_AGENTS[probe.client] || DEFAULT_UA
    };
  });
}

module.exports = async (req, res) => {
  const id = new URL(req.url, 'http://localhost').searchParams.get('id') || '';
  if (!/^[\w-]{11}$/.test(id)) {
    res.statusCode = 400;
    return res.end('ID video tidak valid.');
  }

  try {
    const source = await resolveSource(id);
    const upstream = await axios.get(source.url, {
      responseType: 'stream',
      timeout: 20000,
      validateStatus: () => true,
      headers: { 'User-Agent': source.userAgent, Range: req.headers.range || 'bytes=0-' }
    });

    const headers = { 'Content-Type': source.mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=600' };
    ['content-length', 'content-range'].forEach((name) => {
      if (upstream.headers[name]) headers[name] = upstream.headers[name];
    });

    res.writeHead(upstream.status === 200 || upstream.status === 206 ? upstream.status : 502, headers);
    upstream.data.pipe(res);
    req.on('close', () => upstream.data.destroy());
  } catch (err) {
    if (!res.headersSent) res.statusCode = 502;
    res.end('Audio tidak tersedia.');
  }
};
