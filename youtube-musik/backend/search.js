const { ytm, remember, toTrack, isTrack } = require('./client');

module.exports = async (req, res) => {
  const query = (new URL(req.url, 'http://localhost').searchParams.get('q') || '').trim();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (query.length < 2 || query.length > 100) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Kata kunci minimal 2 karakter.' }));
  }

  try {
    const data = await remember(`q:${query.toLowerCase()}`, 5 * 60 * 1000, () => ytm.runSearch(query));
    const { songs = [], music_videos: videos = [], albums = [] } = data.results || {};
    const tracks = [...songs, ...videos].filter(isTrack).map(toTrack);
    const albumCards = albums.filter((a) => a.album_id).slice(0, 8).map((a) => ({
      id: a.album_id,
      title: a.title,
      artist: a.artist || '',
      year: a.release_date || '',
      thumbnail: a.thumbnail_url
    }));
    res.end(JSON.stringify({ query, tracks, albums: albumCards }));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Pencarian gagal. Coba lagi sebentar.' }));
  }
};
