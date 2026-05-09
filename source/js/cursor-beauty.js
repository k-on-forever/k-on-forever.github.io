(function () {
  // Disable only on coarse pointers (mobile/tablet).
  // `ontouchstart in window` can be true on some desktop browsers.
  const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (isCoarsePointer) return;

  document.documentElement.classList.add('beauty-cursor-on');

  const dot = document.createElement('div');
  dot.className = 'beauty-cursor-dot';
  document.body.appendChild(dot);
  const ring = document.createElement('div');
  ring.className = 'beauty-cursor-ring';
  document.body.appendChild(ring);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let hoverTarget = null;

  const move = (x, y) => {
    dot.style.setProperty('--cursor-x', `${x}px`);
    dot.style.setProperty('--cursor-y', `${y}px`);
  };
  const moveRing = (x, y) => {
    ring.style.setProperty('--cursor-x', `${x}px`);
    ring.style.setProperty('--cursor-y', `${y}px`);
  };

  const lerp = (a, b, n) => a + (b - a) * n;
  const hoverSelector = 'a, button, [role="button"], .menu-item, .aplayer button, .post-title, .article-title';
  const tick = () => {
    let targetX = mouseX;
    let targetY = mouseY;

    if (hoverTarget && hoverTarget.isConnected) {
      const rect = hoverTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      // Light magnetic pull with distance cap, to avoid visible separation.
      const pullX = (centerX - mouseX) * 0.08;
      const pullY = (centerY - mouseY) * 0.08;
      const pullLen = Math.hypot(pullX, pullY);
      const maxPull = 5;
      const scale = pullLen > maxPull ? (maxPull / pullLen) : 1;
      targetX = mouseX + pullX * scale;
      targetY = mouseY + pullY * scale;
    }

    /* 越大越跟手（0~1）；原 0.2 偏「飘」 */
    ringX = lerp(ringX, targetX, 0.42);
    ringY = lerp(ringY, targetY, 0.42);
    moveRing(ringX, ringY);
    window.requestAnimationFrame(tick);
  };

  document.addEventListener(
    'mousemove',
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      move(mouseX, mouseY);

      const t = e.target && e.target.closest ? e.target.closest(hoverSelector) : null;
      hoverTarget = t || null;
      ring.classList.toggle('is-hover', !!hoverTarget);
    },
    { passive: true }
  );

  document.addEventListener(
    'mousedown',
    () => {
      dot.classList.add('is-down');
      ring.classList.add('is-down');
    },
    { passive: true }
  );

  document.addEventListener(
    'mouseup',
    () => {
      dot.classList.remove('is-down');
      ring.classList.remove('is-down');
    },
    { passive: true }
  );

  // Hide when leaving window
  document.addEventListener(
    'mouseleave',
    () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
      hoverTarget = null;
      ring.classList.remove('is-hover');
    },
    { passive: true }
  );
  document.addEventListener(
    'mouseenter',
    () => {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    },
    { passive: true }
  );

  // start
  move(mouseX, mouseY);
  moveRing(ringX, ringY);
  window.requestAnimationFrame(tick);
})();

