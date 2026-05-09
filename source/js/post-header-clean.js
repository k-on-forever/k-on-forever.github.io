/**
 * 文章页顶栏：移除背景图，替换为柔和渐变
 * 运行时机：DOMContentLoaded + pjax 完成后重新执行
 */
(() => {
  const GRADIENT_LIGHT = 'linear-gradient(135deg, #e8f4fd 0%, #f0e6ff 50%, #fce4ec 100%)';
  const GRADIENT_DARK  = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';

  function cleanPostHeader() {
    const header = document.querySelector('#page-header.post-bg');
    if (!header) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gradient = isDark ? GRADIENT_DARK : GRADIENT_LIGHT;

    // 清除内联背景样式
    header.style.removeProperty('background');
    header.style.removeProperty('background-image');
    header.style.removeProperty('background-size');
    header.style.removeProperty('background-position');
    header.style.removeProperty('background-repeat');
    header.style.removeProperty('background-attachment');

    // 设为柔和渐变
    header.style.background = gradient;
    header.style.minHeight = '180px';
    header.style.height = 'auto';
    header.style.maxHeight = '220px';

    // 导航栏：浅色玻璃风
    const nav = header.querySelector('#nav');
    if (nav) {
      nav.style.background = 'rgba(255, 255, 255, 0.92)';
    }
  }

  // 监听深色模式切换
  const observer = new MutationObserver(() => {
    if (document.querySelector('#page-header.post-bg')) {
      cleanPostHeader();
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // 首次执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanPostHeader);
  } else {
    cleanPostHeader();
  }

  // PJAX 完成后重新执行
  if (window.btf && typeof window.btf.addGlobalFn === 'function') {
    window.btf.addGlobalFn('pjaxComplete', cleanPostHeader, 'cleanPostHeader');
  }
})();