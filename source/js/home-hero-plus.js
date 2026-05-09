(() => {
  'use strict';

  const HERO_ID = 'home-hero-plus';

  function getHeader() {
    return document.querySelector('#page-header.full_page');
  }

  function removeExistingLayer() {
    const old = document.getElementById(HERO_ID);
    if (old) old.remove();
  }

  function createLayer(header) {
    const layer = document.createElement('div');
    layer.id = HERO_ID;
    layer.className = 'home-hero-plus';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `
      <span class="hero-orb orb-a"></span>
      <span class="hero-orb orb-b"></span>
      <span class="hero-orb orb-c"></span>
    `;
    header.appendChild(layer);
    return layer;
  }

  function bindParallax(layer) {
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      layer.style.setProperty('--hero-shift-y', `${Math.min(120, y * 0.2)}px`);
      layer.style.setProperty('--hero-orb-shift', `${Math.min(80, y * 0.1)}px`);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function init() {
    removeExistingLayer();
    const header = getHeader();
    if (!header) return;
    const layer = createLayer(header);
    bindParallax(layer);
    document.body.classList.add('hero-plus-on');
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:complete', init);
})();
