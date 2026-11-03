(() => {
  // localhost hanya sementara untuk tes; dihapus saat "SIAP DEPLOY".
  const PIN_HOSTS = ['nyr-youtube-music-v1.vercel.app', 'localhost', '127.0.0.1'];
  const TARGET = '/youtube-musik/app/index.html';

  if (!PIN_HOSTS.includes(location.hostname)) {
    document.documentElement.innerHTML =
      '<body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font:700 18px monospace;text-align:center;padding:24px">link tidak resmi! Tidak dapat dibuka!</body>';
    window.stop();
    return;
  }
  if (document.body && document.body.hasAttribute('data-gate')) location.replace(TARGET);
})();
