/**
 * 外链图片（如 CSDN i-blog.csdnimg.cn）常按 Referer 防盗链。
 * 给正文里外链 <img> 加 referrerpolicy="no-referrer"，减少「裂图」。
 * 若仍失败，请把图下载到 source/images/ 改用本地路径。
 */
hexo.extend.filter.register('after_render:html', function (str) {
  if (typeof str !== 'string' || !str.includes('<img')) return str;
  return str.replace(/<img\b[^>]*>/gi, (full) => {
    if (/referrerpolicy\s*=/i.test(full)) return full;
    return full.replace(/<img\b/i, '<img referrerpolicy="no-referrer"');
  });
});
