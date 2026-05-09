/**
 * Live2D 看板娘（stevenjoezhang/live2d-widget，经 npm 包 live2d-widgets 分发）
 * - 模型：live2d_api（默认 bilibili 22）；文案：/waifu-tips-lite.json；tools：无按钮。
 */
(function () {
  if (window.__live2dWaifuBooted) return;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
  if (window.innerWidth < 768) return;

  window.__live2dWaifuBooted = true;

  const LIVE2D_DIST = 'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0/dist/';
  const CDN_MODELS = 'https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/';

  const loadCSS = (href) =>
    new Promise((resolve, reject) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = () => resolve();
      l.onerror = () => reject(new Error('CSS: ' + href));
      document.head.appendChild(l);
    });

  /* 勿全局改写 window.Image + crossOrigin：会影响其它脚本用 new Image() 预加载，外链无 CORS 时可能裂图 */

  (async () => {
    try {
      await loadCSS(LIVE2D_DIST + 'waifu.css');
      await import(LIVE2D_DIST + 'waifu-tips.js');
      if (typeof window.initWidget !== 'function') {
        console.warn('[Live2D] initWidget 未定义');
        return;
      }

      window.initWidget({
        waifuPath: '/waifu-tips-lite.json',
        cdnPath: CDN_MODELS,
        cubism2Path: LIVE2D_DIST + 'live2d.min.js',
        cubism5Path: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
        /* model_list.json: 0 Pio 1 Tia 2 bilibili22 3 bilibili33 4 Shizuku … */
        modelId: 2,
        tools: [],
        drag: false,
        logLevel: 'error',
      });
    } catch (e) {
      console.warn('[Live2D] 加载失败（可忽略或检查网络/CDN）', e);
    }
  })();
})();
