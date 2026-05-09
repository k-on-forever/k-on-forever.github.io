(function() {
  function updateProgress() {
    const progressSpan = document.getElementById('progress');
    if (!progressSpan) return;

    // 基于当前秒数计算百分比（0-59秒 → 0%-100%）
    const now = new Date();
    const seconds = now.getSeconds();
    const percent = Math.floor((seconds / 60) * 100);
    progressSpan.textContent = percent + '%';
  }

  updateProgress();                 // 立即执行一次
  setInterval(updateProgress, 1000); // 每秒更新
})();