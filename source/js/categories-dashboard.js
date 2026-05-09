(() => {
  const isCategoriesPage = document.querySelector('.page.type-categories');
  if (!isCategoriesPage) return;

  const ensureChartJs = () => typeof window.Chart !== 'undefined';

  const pick = (arr, i) => arr[i % arr.length];

  const palette = [
    '#38bdf8', // sky
    '#818cf8', // indigo
    '#f472b6', // pink
    '#34d399', // emerald
    '#fb7185', // rose
    '#a78bfa', // violet
    '#22c55e', // green
    '#f59e0b', // amber
    '#06b6d4', // cyan
    '#e879f9'  // fuchsia
  ];

  const el = {
    root: () => document.querySelector('#page'),
    listsWrap: () => document.querySelector('#page .category-lists') || document.querySelector('#page'),
    list: () => document.querySelector('#page .category-lists > ul.category-list, #page > ul.category-list, #page .category-lists ul.category-list, #page ul.category-list')
  };

  const text = n => (n ? n.textContent : '').trim();
  const href = n => (n && n.getAttribute ? (n.getAttribute('href') || '') : '');
  const toInt = v => {
    const n = Number(String(v).replace(/[()]/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  };

  function parseCategoryTree(ul, prefix = []) {
    if (!ul) return [];
    const items = [];
    const liList = [...ul.children].filter(n => n && n.tagName === 'LI');
    for (const li of liList) {
      const link = li.querySelector(':scope > a.category-list-link') || li.querySelector(':scope > a');
      const countEl = li.querySelector(':scope > .category-list-count');
      const childUl = li.querySelector(':scope > ul');
      const name = text(link) || text(li.querySelector(':scope > span'));
      const count = toInt(text(countEl));
      const url = href(link);
      const path = [...prefix, name].filter(Boolean);
      items.push({ name, path, count, depth: prefix.length, url });
      if (childUl) items.push(...parseCategoryTree(childUl, path));
    }
    return items;
  }

  function buildDashboard(treeItems) {
    const page = el.root();
    if (!page) return null;

    // If already built (pjax/themeChange), do nothing
    if (page.querySelector('.acg-catdash')) return page.querySelector('.acg-catdash');

    const dash = document.createElement('section');
    dash.className = 'acg-catdash';

    const header = document.createElement('div');
    header.className = 'acg-catdash__header';

    const title = document.createElement('div');
    title.className = 'acg-catdash__title';
    title.textContent = '文章分类统计';

    const subtitle = document.createElement('div');
    subtitle.className = 'acg-catdash__subtitle';
    subtitle.textContent = '按分类汇总文章数量（支持多级分类）';

    header.appendChild(title);
    header.appendChild(subtitle);

    const chips = document.createElement('div');
    chips.className = 'acg-catdash__chips';

    // Chips: prefer top-level categories (cleaner + more "premium")
    const top = treeItems.filter(it => it.depth === 0);
    const listForChips = (top.length ? top : treeItems).filter(it => it.count > 0);
    const sorted = [...listForChips].sort((a, b) => b.count - a.count);
    const maxChips = 12;
    const slice = sorted.slice(0, maxChips);

    slice.forEach((it, idx) => {
      const chip = document.createElement('a');
      chip.className = `acg-chip acg-chip--d${Math.min(it.depth, 2)}`;
      chip.href = it.url || '#';
      chip.title = it.path.join(' / ');

      const dot = document.createElement('span');
      dot.className = 'acg-chip__dot';
      const color = pick(palette, idx);
      chip.style.setProperty('--chip-color', color);
      dot.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0) 58%), ${color}`;

      const label = document.createElement('span');
      label.className = 'acg-chip__label';
      label.textContent = it.depth ? it.name : it.name;

      const count = document.createElement('span');
      count.className = 'acg-chip__count';
      count.textContent = String(it.count);

      chip.appendChild(dot);
      chip.appendChild(label);
      chip.appendChild(count);

      // Hover: highlight chart slice if index matches
      chip.addEventListener('mouseenter', () => {
        const i = Number(chip.dataset.idx);
        if (!Number.isFinite(i)) return;
        const chart = dash.__chart;
        if (!chart) return;
        chart.setActiveElements([{ datasetIndex: 0, index: i }]);
        chart.update();
      });

      chip.dataset.idx = String(idx);
      chips.appendChild(chip);
    });

    const body = document.createElement('div');
    body.className = 'acg-catdash__body';

    const chartWrap = document.createElement('div');
    chartWrap.className = 'acg-catdash__chart';

    const canvas = document.createElement('canvas');
    canvas.className = 'acg-catdash__canvas';
    canvas.width = 720;
    canvas.height = 420;

    chartWrap.appendChild(canvas);
    body.appendChild(chartWrap);

    dash.appendChild(header);
    dash.appendChild(chips);
    dash.appendChild(body);

    // Insert before category list, and hide original list (keep for SEO/accessibility)
    const wrap = el.listsWrap();
    if (wrap) {
      wrap.prepend(dash);
      const list = el.list();
      if (list) {
        list.classList.add('acg-catdash__sr-list');
      }
    } else {
      page.prepend(dash);
    }

    dash.__canvas = canvas;
    return dash;
  }

  function renderChart(dash, items) {
    if (!dash || !dash.__canvas) return;
    if (!ensureChartJs()) return;

    // Prefer top-level categories for chart clarity
    const top = items.filter(it => it.depth === 0);
    const chartItems = (top.length ? top : items).filter(it => it.count > 0);

    const labels = chartItems.map(it => it.name);
    const values = chartItems.map(it => it.count);
    const colors = chartItems.map((_, i) => pick(palette, i));

    const ctx = dash.__canvas.getContext('2d');
    if (!ctx) return;

    // Destroy existing
    if (dash.__chart) {
      try { dash.__chart.destroy(); } catch (_) {}
      dash.__chart = null;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const fontColor = isDark ? 'rgba(241,245,249,0.9)' : 'rgba(15,23,42,0.82)';
    const gridColor = isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)';
    const total = values.reduce((a, b) => a + b, 0);

    const centerTextPlugin = {
      id: 'acgCenterText',
      afterDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data.length) return;
        const x = meta.data[0].x;
        const y = meta.data[0].y;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = fontColor;
        ctx.font = '800 26px Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.fillText(String(total), x, y - 6);

        ctx.fillStyle = isDark ? 'rgba(148,163,184,0.85)' : 'rgba(51,65,85,0.68)';
        ctx.font = '600 12px Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.fillText('总文章数', x, y + 18);

        ctx.restore();
      }
    };

    dash.__chart = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255,255,255,0.85)',
            borderWidth: 3,
            hoverOffset: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)',
            titleColor: fontColor,
            bodyColor: fontColor,
            borderColor: gridColor,
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.parsed}`
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    });
  }

  function init() {
    const ul = el.list();
    if (!ul) return;
    const items = parseCategoryTree(ul);
    if (!items.length) return;

    const dash = buildDashboard(items);
    if (!dash) return;

    renderChart(dash, items);
  }

  // Run now and on theme events
  init();
  if (window.btf && typeof window.btf.addGlobalFn === 'function') {
    window.btf.addGlobalFn('pjaxComplete', init, 'acg_catdash');
    window.btf.addGlobalFn('themeChange', init, 'acg_catdash_theme');
  }
})();

