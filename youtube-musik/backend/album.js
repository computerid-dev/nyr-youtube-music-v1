const { ytm, remember } = require('./client');

module.exports = async (req, res) => {
  const id = new URL(req.url, 'http://localhost').searchParams.get('id') || '';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!/^MPREb[\w-]+$/.test(id)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'ID album tidak valid.' }));
  }

  try {
    const album = await remember(`album:${id}`, 30 * 60 * 1000, () => ytm.enrichAlbum({ album_id: id }));
    const tracks = (album.track_list || [])
      .filter((t) => t.video_id)
      .map((t) => ({ id: t.video_id, title: t.title, artist: t.artist || album.artist || '', duration: t.duration_seconds }));
    res.end(JSON.stringify({ artist: album.artist || '', year: album.release_date || '', tracks }));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Album gagal dimuat.' }));
  }
};
