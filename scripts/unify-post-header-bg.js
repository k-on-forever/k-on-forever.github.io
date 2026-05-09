/**
 * 文章页顶部横幅与首页 index_img 使用同一张图，避免「每篇文章顶图不一样」显得突兀。
 * 列表卡片仍用各篇 front matter 的 cover（或随机默认图），不受影响。
 */
hexo.extend.filter.register(
  'before_post_render',
  function (data) {
    if (data.layout !== 'post') return data;
    const cfg = hexo.theme && hexo.theme.config ? hexo.theme.config : {};
    const idx = cfg.index_img || '/img/bg_index.jpg';
    data.top_img = idx;
    return data;
  },
  11
);
