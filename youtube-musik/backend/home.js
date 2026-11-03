const { ytm, remember, toTrack, isTrack } = require('./client');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const home = await remember('home', 10 * 60 * 1000, () => ytm.fetchHomeFlow());
    const sections = home.sections
      .map((section) => ({
        title: section.section_name,
        tracks: section.section_items.filter(isTrack).map(toTrack)
      }))
      .filter((section) => section.title && section.tracks.length > 0);
    res.end(JSON.stringify({ sections }));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Beranda gagal dimuat.' }));
  }
};
