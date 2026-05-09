(() => {
  const KEY = 'acg_font_preset';
  const WAIFU_KEY = 'acg_hide_waifu';

  const PRESETS = [
    {
      id: 'sans',
      name: '清爽黑体',
      body: '"Inter", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      heading: '"Poppins", "Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    },
    {
      id: 'wenkai',
      name: '文楷',
      body: '"LXGW WenKai Screen", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      heading: '"Poppins", "Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    },
    {
      id: 'serif',
      name: '衬线宋体',
      body: '"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif',
      heading: '"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif',
    },
    {
      id: 'cute',
      name: '可爱手写',
      body: '"ZCOOL KuaiLe", "LXGW WenKai Screen", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      heading: '"ZCOOL KuaiLe", "Poppins", "Inter", "Noto Sans SC", system-ui, sans-serif',
    },
  ];

  const read = () => {
    try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; }
  };
  const write = (id) => {
    try { localStorage.setItem(KEY, id); } catch (_) {}
  };

  const readWaifu = () => {
    try { return localStorage.getItem(WAIFU_KEY) === '1'; } catch (_) { return false; }
  };
  const writeWaifu = (hidden) => {
    try { localStorage.setItem(WAIFU_KEY, hidden ? '1' : '0'); } catch (_) {}
  };

  const getPreset = (id) => PRESETS.find(p => p.id === id) || PRESETS[0];

  const applyPreset = (preset) => {
    const root = document.documentElement;
    root.dataset.font = preset.id;
    root.style.setProperty('--site-font-body', preset.body);
    root.style.setProperty('--site-font-heading', preset.heading);
  };

  const ensureBtn = () => {
    const host = document.getElementById('rightside-config-show');
    if (!host) return null;
    let btn = document.getElementById('acg-font-switch');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'acg-font-switch';
      btn.type = 'button';
      btn.className = 'acg-font-switch';
      btn.innerHTML = '<span class="acg-font-switch__a">A</span>';
      host.insertBefore(btn, host.firstChild);
    }
    return btn;
  };

  const updateBtn = (btn, preset) => {
    if (!btn) return;
    btn.setAttribute('title', `字体设置（当前：${preset.name}）`);
    btn.setAttribute('aria-label', `Font settings: ${preset.name}`);
    btn.dataset.preset = preset.id;
  };

  const ensurePanel = () => {
    let overlay = document.getElementById('acg-font-panel');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'acg-font-panel';
      overlay.className = 'acg-font-panel';
      overlay.innerHTML = `
        <div class="acg-font-panel__mask" data-close></div>
        <div class="acg-font-panel__card" role="dialog" aria-modal="true" aria-label="Font settings">
          <div class="acg-font-panel__header">
            <div class="acg-font-panel__title">外观设置</div>
            <button class="acg-font-panel__close" type="button" data-close aria-label="Close"><i class="fas fa-times"></i></button>
          </div>
          <div class="acg-font-panel__section">
            <div class="acg-font-panel__section-title">字体</div>
            <div class="acg-font-panel__grid" data-font-grid></div>
          </div>
          <div class="acg-font-panel__section">
            <div class="acg-font-panel__row">
              <div>
                <div class="acg-font-panel__section-title" style="margin:0">看板娘</div>
                <div class="acg-font-panel__hint">隐藏后将不遮挡页面</div>
              </div>
              <label class="acg-switch">
                <input type="checkbox" data-waifu-toggle />
                <span class="acg-switch__track"></span>
              </label>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        const t = e.target;
        if (t && (t.dataset && t.dataset.close !== undefined)) {
          closePanel();
        }
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
      });
    }
    return overlay;
  };

  const openPanel = () => {
    const overlay = ensurePanel();
    overlay.classList.add('is-open');
    document.documentElement.classList.add('acg-font-panel-open');
    renderPanel(overlay);
  };

  const closePanel = () => {
    const overlay = document.getElementById('acg-font-panel');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('acg-font-panel-open');
  };

  const renderPanel = (overlay) => {
    const current = getPreset(read());
    const grid = overlay.querySelector('[data-font-grid]');
    if (grid) {
      grid.innerHTML = '';
      PRESETS.forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'acg-font-choice';
        btn.dataset.id = p.id;
        btn.setAttribute('aria-pressed', p.id === current.id ? 'true' : 'false');
        btn.innerHTML = `
          <div class="acg-font-choice__name">${p.name}</div>
          <div class="acg-font-choice__preview" style="font-family:${p.body}">示例文本 Aa 123，中文阅读更舒服</div>
        `;
        btn.addEventListener('click', () => {
          write(p.id);
          applyPreset(p);
          const floatBtn = document.getElementById('acg-font-switch');
          updateBtn(floatBtn, p);
          renderPanel(overlay);
        });
        grid.appendChild(btn);
      });
    }

    const waifu = overlay.querySelector('[data-waifu-toggle]');
    if (waifu) {
      waifu.checked = !readWaifu();
      waifu.onchange = () => {
        writeWaifu(!waifu.checked);
        // waifu-toggle.js will observe and apply; we also dispatch a storage event-like signal
        window.dispatchEvent(new Event('acgWaifuPrefChanged'));
      };
    }
  };

  const init = () => {
    const current = read();
    const preset = getPreset(current);
    applyPreset(preset);

    const btn = ensureBtn();
    if (!btn) return;
    if (!btn.__acgFontBound) {
      btn.__acgFontBound = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPanel();
      });
    }
    updateBtn(btn, preset);
  };

  init();
  if (window.btf && typeof window.btf.addGlobalFn === 'function') {
    window.btf.addGlobalFn('pjaxComplete', init, 'acg_font_switch');
    window.btf.addGlobalFn('themeChange', init, 'acg_font_switch_theme');
  }
})();

