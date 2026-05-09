(() => {
  'use strict';

  function bindProgressColor() {
    const bar = document.querySelector('#progress');
    const sections = Array.from(document.querySelectorAll('#article-container h2[id], #article-container h3[id]'));
    if (!bar || !sections.length) return;

    const palette = ['#4AA3FF', '#14b8a6', '#8b5cf6', '#f97316', '#ec4899'];

    const onScroll = () => {
      const y = window.scrollY + window.innerHeight * 0.25;
      let activeIndex = 0;
      for (let i = 0; i < sections.length; i += 1) {
        if (sections[i].offsetTop <= y) activeIndex = i;
        else break;
      }
      bar.style.background = palette[activeIndex % palette.length];
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function bindTocEnhance() {
    const article = document.querySelector('#article-container');
    const headings = Array.from(document.querySelectorAll('#article-container h2[id], #article-container h3[id]'));
    const tocLinks = Array.from(document.querySelectorAll('#card-toc .toc-link[href^="#"]'));
    const tocContent = document.querySelector('#card-toc .toc-content');
    if (!article || !headings.length || !tocLinks.length || !tocContent) return;

    const idToLink = new Map();
    tocLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const id = decodeURIComponent(href.replace(/^#/, ''));
      if (!id) return;
      idToLink.set(id, link);
    });

    const setCurrentLink = (activeId) => {
      tocLinks.forEach((link) => {
        link.classList.remove('toc-current');
      });
      const activeLink = idToLink.get(activeId);
      if (activeLink) activeLink.classList.add('toc-current');
    };

    const onScroll = () => {
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const articleTop = article.offsetTop;
      const articleHeight = article.offsetHeight;
      const viewBottom = scrollTop + window.innerHeight;
      const progressRaw = ((viewBottom - articleTop) / Math.max(1, articleHeight)) * 100;
      const progress = Math.max(0, Math.min(100, progressRaw));
      tocContent.style.setProperty('--toc-read-progress', `${progress.toFixed(2)}%`);

      const y = scrollTop + window.innerHeight * 0.28;
      let currentId = headings[0].id;
      for (let i = 0; i < headings.length; i += 1) {
        if (headings[i].offsetTop <= y) currentId = headings[i].id;
        else break;
      }
      setCurrentLink(currentId);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function init() {
    bindProgressColor();
    bindTocEnhance();
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:complete', init);
})();
