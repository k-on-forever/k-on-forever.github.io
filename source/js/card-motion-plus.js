(() => {
  'use strict';

  const CARD_SELECTOR = '#recent-posts .recent-post-item';
  const MAX_TILT = 6;

  function resetCard(card) {
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '50%');
  }

  function bindCard(card) {
    if (card.dataset.motionBound === '1') return;
    card.dataset.motionBound = '1';

    resetCard(card);

    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const tiltY = (px - 0.5) * (MAX_TILT * 2);
      const tiltX = (0.5 - py) * (MAX_TILT * 2);

      card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
      card.style.setProperty('--mx', `${(px * 100).toFixed(2)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(2)}%`);
    });

    card.addEventListener('mouseleave', () => {
      resetCard(card);
    });

    card.addEventListener('mousedown', () => {
      card.classList.add('is-pressing');
    });

    window.addEventListener('mouseup', () => {
      card.classList.remove('is-pressing');
    });
  }

  function init() {
    const cards = document.querySelectorAll(CARD_SELECTOR);
    cards.forEach(bindCard);
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:complete', init);
})();
