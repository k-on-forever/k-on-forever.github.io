/**
 * Live2D 看板娘 — 使用 stevenjoezhang/live2d-widget (L2Dwidget)
 * 模型源：unpkg CDN（可靠稳定）
 * - 模型：Shizuku（经典白无瑕）
 * - 表情互动：鼠标悬停/点击有气泡消息
 * - 延迟加载：首屏渲染完成后加载，不阻塞 FCP
 */
(function () {
  if (window.__live2dWaifuBooted) return;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
  if (window.innerWidth < 768) return;

  const loadLive2D = () => {
    if (window.__live2dWaifuBooted) return;
    window.__live2dWaifuBooted = true;

    (async () => {
      try {
        // 加载 L2Dwidget 核心库（stevenjoezhang 的经典实现）
        const l2dScript = document.createElement('script');
        l2dScript.src = 'https://cdn.jsdelivr.net/npm/live2d-widget@3.1.4/lib/L2Dwidget.min.js';
        l2dScript.async = true;

        await new Promise((resolve, reject) => {
          l2dScript.onload = resolve;
          l2dScript.onerror = reject;
          document.head.appendChild(l2dScript);
        });

        if (typeof window.L2Dwidget === 'undefined') {
          console.warn('[Live2D] L2Dwidget 加载失败');
          return;
        }

        // 初始化看板娘
        window.L2Dwidget.init({
          pluginRootPath: 'https://cdn.jsdelivr.net/npm/live2d-widget@3.1.4/',
          pluginJsPath: 'lib/',
          pluginModelPath: 'assets/',
          model: {
            // 御坂美琴 Mikoto（超电磁炮，常盘台校服少女）
            jsonPath: 'https://unpkg.com/live2d-widget-model-mikoto@1.0.0/assets/mikoto.model.json',
          },
          display: {
            superSample: 2,
            width: 170,
            height: 340,
            position: 'right',
            hOffset: 10,
            vOffset: -10,
          },
          mobile: {
            show: false,
            scale: 0.5,
          },
          react: {
            opacityDefault: 0.85,
            opacityHover: 1,
          },
        });

        console.log('[Live2D] L2Dwidget 初始化完成');
      } catch (e) {
        console.warn('[Live2D] 加载失败', e);
      }
    })();
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => loadLive2D(), { timeout: 3000 });
  } else {
    setTimeout(() => loadLive2D(), 2000);
  }
})();
