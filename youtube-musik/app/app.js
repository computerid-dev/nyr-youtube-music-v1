(() => {
  const $ = (id) => document.getElementById(id);
  const els = {
    content: $('content'), form: $('searchForm'), input: $('searchInput'), player: $('player'), audio: $('audio'),
    cover: $('cover'), title: $('nowTitle'), artist: $('nowArtist'), playBtn: $('playBtn'), prevBtn: $('prevBtn'),
    nextBtn: $('nextBtn'), seek: $('seek'), current: $('currentTime'), total: $('totalTime')
  };
  const FAV_KEY = 'ytm:favorites';
  const state = { queue: [], index: -1, seeking: false, tab: 'home', favorites: loadFavorites() };

  function loadFavorites() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; }
  }
  const saveFavorites = () => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(state.favorites)); } catch { /* penyimpanan penuh atau diblokir */ }
  };
  const isFavorite = (id) => state.favorites.some((t) => t.id === id);
  const toggleFavorite = (track) => {
    state.favorites = isFavorite(track.id) ? state.favorites.filter((t) => t.id !== track.id) : [track, ...state.favorites];
    saveFavorites();
  };

  const formatTime = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const showNotice = (message) => { els.content.replaceChildren(make('p', 'notice', message)); };

  const fetchJson = async (url) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
    return data;
  };

  const setActiveTab = (tab) => {
    state.tab = tab;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
  };

  const markActive = () => {
    const current = state.queue[state.index];
    document.querySelectorAll('.track').forEach((el) => el.classList.toggle('is-active', !!current && el.dataset.id === current.id));
  };

  const renderTrack = (track, list) => {
    const item = make('li');
    const row = make('div', 'track');
    row.dataset.id = track.id;

    const play = make('button', 'track-play');
    play.type = 'button';
    const img = make('img');
    img.src = track.thumbnail || '';
    img.alt = '';
    img.loading = 'lazy';
    const text = make('div', 'track-text');
    text.append(make('p', 'track-title', track.title), make('p', 'track-artist', [track.artist, track.duration ? formatTime(track.duration) : ''].filter(Boolean).join(' · ')));
    play.append(img, text);
    play.addEventListener('click', () => playFrom(list, list.indexOf(track)));

    const fav = make('button', 'fav-btn', isFavorite(track.id) ? 'FAV' : '+FAV');
    fav.type = 'button';
    fav.setAttribute('aria-label', 'Tambah atau hapus dari favorit');
    fav.classList.toggle('is-on', isFavorite(track.id));
    fav.addEventListener('click', () => {
      toggleFavorite(track);
      if (state.tab === 'favorites') return renderFavorites();
      fav.textContent = isFavorite(track.id) ? 'FAV' : '+FAV';
      fav.classList.toggle('is-on', isFavorite(track.id));
    });

    row.append(play, fav);
    item.append(row);
    return item;
  };

  const renderTrackSection = (title, tracks) => {
    const section = make('section', 'section');
    section.append(make('h2', 'section-title', title));
    const list = make('ul', 'track-list');
    tracks.forEach((t) => list.append(renderTrack(t, tracks)));
    section.append(list);
    els.content.append(section);
  };

  const renderAlbumCards = (albums) => {
    const section = make('section', 'section');
    section.append(make('h2', 'section-title', 'Album'));
    const list = make('ul', 'card-list');
    albums.forEach((album) => {
      const item = make('li');
      const card = make('button', 'card');
      card.type = 'button';
      const img = make('img');
      img.src = album.thumbnail || '';
      img.alt = '';
      img.loading = 'lazy';
      card.append(img, make('p', 'card-title', album.title), make('p', 'card-sub', [album.artist, album.year].filter(Boolean).join(' · ')));
      card.addEventListener('click', () => openAlbum(album));
      item.append(card);
      list.append(item);
    });
    section.append(list);
    els.content.append(section);
  };

  const playFrom = (queue, index) => {
    if (index < 0 || index >= queue.length) return;
    state.queue = queue;
    state.index = index;
    const track = queue[index];
    els.player.hidden = false;
    els.title.textContent = track.title;
    els.artist.textContent = track.artist;
    els.cover.src = track.thumbnail || '';
    els.audio.src = `/api/stream?id=${encodeURIComponent(track.id)}`;
    els.audio.play().catch(() => {});
    markActive();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title, artist: track.artist,
        artwork: track.thumbnail ? [{ src: track.thumbnail, sizes: '544x544' }] : []
      });
    }
  };
  const step = (dir) => playFrom(state.queue, state.index + dir);

  const loadHome = async () => {
    setActiveTab('home');
    showNotice('Memuat beranda...');
    try {
      const { sections } = await fetchJson('/api/home');
      if (!sections.length) return showNotice('Beranda kosong. Coba cari lagu di atas.');
      els.content.replaceChildren();
      sections.forEach((s) => renderTrackSection(s.title, s.tracks));
      markActive();
    } catch (err) {
      showNotice(`${err.message} Kamu tetap bisa mencari lagu lewat kolom pencarian.`);
    }
  };

  const runSearch = async (query) => {
    setActiveTab('home');
    showNotice('Mencari...');
    try {
      const { tracks, albums } = await fetchJson(`/api/search?q=${encodeURIComponent(query)}`);
      if (!tracks.length && !albums.length) return showNotice(`Tidak ada hasil untuk "${query}".`);
      els.content.replaceChildren();
      if (tracks.length) renderTrackSection(`Lagu: "${query}"`, tracks);
      if (albums.length) renderAlbumCards(albums);
      markActive();
    } catch (err) {
      showNotice(err.message);
    }
  };

  const openAlbum = async (album) => {
    showNotice('Memuat album...');
    try {
      const data = await fetchJson(`/api/album?id=${encodeURIComponent(album.id)}`);
      const tracks = data.tracks.map((t) => ({ ...t, thumbnail: album.thumbnail }));
      if (!tracks.length) return showNotice('Album ini tidak punya lagu yang bisa diputar.');
      els.content.replaceChildren();
      const head = make('div', 'section-head');
      const back = make('button', 'btn', 'Kembali');
      back.type = 'button';
      back.addEventListener('click', () => (els.input.value.trim().length >= 2 ? runSearch(els.input.value.trim()) : loadHome()));
      head.append(back);
      els.content.append(head);
      renderTrackSection(`${album.title} - ${album.artist || data.artist}`, tracks);
      markActive();
    } catch (err) {
      showNotice(err.message);
    }
  };

  function renderFavorites() {
    setActiveTab('favorites');
    if (!state.favorites.length) return showNotice('Belum ada favorit. Tekan +FAV di lagu yang kamu suka.');
    els.content.replaceChildren();
    renderTrackSection('Favorit', state.favorites);
    markActive();
  }

  const renderQueue = () => {
    setActiveTab('queue');
    if (!state.queue.length) return showNotice('Antrean kosong. Putar lagu dulu.');
    els.content.replaceChildren();
    renderTrackSection(`Antrean (${state.queue.length} lagu)`, state.queue);
    markActive();
  };

  document.querySelectorAll('.tab').forEach((btn) => btn.addEventListener('click', () => {
    ({ home: loadHome, favorites: renderFavorites, queue: renderQueue })[btn.dataset.tab]();
  }));

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = els.input.value.trim();
    if (q.length >= 2) runSearch(q);
  });

  els.playBtn.addEventListener('click', () => (els.audio.paused ? els.audio.play().catch(() => {}) : els.audio.pause()));
  els.prevBtn.addEventListener('click', () => (els.audio.currentTime > 5 ? (els.audio.currentTime = 0) : step(-1)));
  els.nextBtn.addEventListener('click', () => step(1));
  els.audio.addEventListener('play', () => (els.playBtn.textContent = 'Jeda'));
  els.audio.addEventListener('pause', () => (els.playBtn.textContent = 'Putar'));
  els.audio.addEventListener('ended', () => step(1));
  els.audio.addEventListener('error', () => {
    if (!els.audio.getAttribute('src')) return;
    els.artist.textContent = 'Lagu ini tidak bisa diputar, lanjut ke berikutnya...';
    setTimeout(() => step(1), 1500);
  });
  els.audio.addEventListener('loadedmetadata', () => (els.total.textContent = formatTime(els.audio.duration)));
  els.audio.addEventListener('timeupdate', () => {
    if (state.seeking || !els.audio.duration) return;
    els.seek.value = (els.audio.currentTime / els.audio.duration) * 100;
    els.current.textContent = formatTime(els.audio.currentTime);
  });
  els.seek.addEventListener('input', () => {
    state.seeking = true;
    els.current.textContent = formatTime((els.seek.value / 100) * els.audio.duration);
  });
  els.seek.addEventListener('change', () => {
    els.audio.currentTime = (els.seek.value / 100) * els.audio.duration;
    state.seeking = false;
  });
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
  }

  loadHome();
})();
