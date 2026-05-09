/**
 * 首页文章卡片：滚动进入视口后淡入上浮（一次性）
 * 配合 custom.css 中 .home-reveal / .is-revealed
 */
(function () {
  function initHomeReveal() {
    var listRoot = document.getElementById('recent-posts');
    var cardItems = listRoot
      ? listRoot.querySelectorAll('.recent-post-item:not(.ads-wrap)')
      : [];
    var asideWidgets = document.querySelectorAll('#aside-content .card-widget');
    var targets = Array.prototype.slice.call(cardItems).concat(Array.prototype.slice.call(asideWidgets));
    if (!targets.length) return;

    if (window.__homeRevealObserver && typeof window.__homeRevealObserver.disconnect === 'function') {
      window.__homeRevealObserver.disconnect();
      window.__homeRevealObserver = null;
    }

    var supportsIo = typeof IntersectionObserver !== 'undefined';
    var obs = supportsIo
      ? new IntersectionObserver(
          function (entries, observer) {
            entries.forEach(function (en) {
              if (en.isIntersecting) {
                en.target.classList.add('is-revealed');
                observer.unobserve(en.target);
              }
            });
          },
          {
            root: null,
            rootMargin: '0px 0px -8% 0px',
            threshold: 0.12,
          }
        )
      : null;

    targets.forEach(function (el) {
      if (el.classList.contains('home-reveal')) return;
      el.classList.add('home-reveal');
    });

    targets.forEach(function (el) {
      if (obs) obs.observe(el);
      else el.classList.add('is-revealed');
    });

    if (obs) {
      window.__homeRevealObserver = obs;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomeReveal);
  } else {
    initHomeReveal();
  }

  window.addEventListener('pjax:complete', initHomeReveal);
})();
