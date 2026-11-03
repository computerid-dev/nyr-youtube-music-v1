process.env.YTM_STREAM_LIMIT = '0';
process.env.YTM_RETRIES = process.env.YTM_RETRIES || '3';

const ytm = require('./ytmusic');

const cache = new Map();

async function remember(key, ttlMs, loader) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await loader();
  cache.set(key, { value, expires: Date.now() + ttlMs });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return value;
}

const toTrack = (item) => ({
  id: item.video_id,
  title: item.title,
  artist: item.artist || (item.artists && item.artists[0] && item.artists[0].name) || '',
  album: item.album || item.album_name || '',
  duration: item.duration_seconds || null,
  thumbnail: item.thumbnail_url
});

const isTrack = (item) => item && item.video_id && item.title;

module.exports = { ytm, remember, toTrack, isTrack };
