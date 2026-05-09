(() => {
  const KEY = 'acg_hide_waifu';

  const getWaifuEls = () => {
    const els = [];
    const push = (n) => { if (n && !els.includes(n)) els.push(n); };
    push(document.getElementById('waifu'));
    push(document.querySelector('.waifu'));
    push(document.querySelector('#live2d-widget'));
    push(document.getElementById('live2dcanvas'));
    push(document.querySelector('canvas#live2dcanvas'));
    // live2d-widgets sometimes uses these
    document.querySelectorAll('canvas[id*="live2d"], .live2d, .live2d-widget, .live2d-container').forEach(push);
    return els.filter(Boolean);
  };

  const apply = (hidden) => {
    document.documentElement.classList.toggle('acg-waifu-hidden', hidden);
    const waifus = getWaifuEls();
    waifus.forEach((w) => { w.style.display = hidden ? 'none' : ''; });
    document.documentElement.classList.toggle('acg-waifu-visible', !hidden && waifus.length > 0);
  };

  const setPresentClass = () => {
    const present = getWaifuEls().length > 0;
    document.documentElement.classList.toggle('acg-waifu-present', present);
    document.documentElement.classList.toggle('acg-waifu-visible', present && !read());
  };

  const read = () => {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  };

  const write = (hidden) => {
    try { localStorage.setItem(KEY, hidden ? '1' : '0'); } catch (_) {}
  };

  const bind = () => {
    // no-op: UI is handled by the font settings panel
  };

  const observe = () => {
    if (window.__acgWaifuObserver) return;
    const obs = new MutationObserver(() => {
      // Waifu is injected async; re-apply whenever it appears/disappears
      setPresentClass();
      apply(read());
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    window.__acgWaifuObserver = obs;
  };

  const init = () => {
    apply(read());
    setPresentClass();
    bind();
    observe();
  };

  init();
  if (window.btf && typeof window.btf.addGlobalFn === 'function') {
    window.btf.addGlobalFn('pjaxComplete', init, 'acg_waifu_toggle');
    window.btf.addGlobalFn('themeChange', init, 'acg_waifu_toggle_theme');
  }

  // Allow other UIs to request immediate re-apply
  window.addEventListener('acgWaifuPrefChanged', () => {
    apply(read());
    setPresentClass();
  });

  // Expose minimal API (optional, for debugging/other scripts)
  window.ACG_WAIFU = window.ACG_WAIFU || {};
  window.ACG_WAIFU.readHidden = read;
  window.ACG_WAIFU.setHidden = (hidden) => {
    write(!!hidden);
    apply(!!hidden);
    setPresentClass();
  };
})();

