(() => {
  const pageType = window.GLOBAL_CONFIG_SITE && window.GLOBAL_CONFIG_SITE.pageType
  if (pageType && pageType !== 'home') return

  const TEXT = '当你为错过太阳哭泣的时候，你也要错过群星了'
  const TYPE_MS = 110
  const HOLD_MS = 1800
  const DELETE_MS = 45

  const state = {
    timer: null,
    el: null,
    idx: 0,
    mode: 'typing',
    mountRetry: 0
  }

  const clearTimer = () => {
    if (state.timer) {
      window.clearTimeout(state.timer)
      state.timer = null
    }
  }

  const ensureEl = () => {
    const pageHeader = document.getElementById('page-header')
    if (!pageHeader) return null
    const siteTitle = document.getElementById('site-title')

    let el = document.getElementById('home-hero-typewriter')
    if (!el) {
      el = document.createElement('div')
      el.id = 'home-hero-typewriter'
      el.className = 'home-hero-typewriter'
      if (siteTitle && siteTitle.parentElement) {
        siteTitle.insertAdjacentElement('afterend', el)
      } else {
        pageHeader.appendChild(el)
      }
    }
    return el
  }

  const tick = () => {
    if (!state.el || !state.el.isConnected) return

    if (state.mode === 'typing') {
      state.el.classList.remove('is-done')
      state.idx = Math.min(TEXT.length, state.idx + 1)
      state.el.textContent = TEXT.slice(0, state.idx)
      if (state.idx >= TEXT.length) {
        state.mode = 'hold'
        state.el.classList.add('is-done')
        state.timer = window.setTimeout(tick, HOLD_MS)
      } else {
        state.timer = window.setTimeout(tick, TYPE_MS)
      }
      return
    }

    if (state.mode === 'hold') {
      state.mode = 'deleting'
      state.el.classList.remove('is-done')
      state.timer = window.setTimeout(tick, DELETE_MS)
      return
    }

    if (state.mode === 'deleting') {
      state.idx = Math.max(0, state.idx - 1)
      state.el.textContent = TEXT.slice(0, state.idx)
      if (state.idx <= 0) {
        state.mode = 'typing'
        state.timer = window.setTimeout(tick, TYPE_MS)
      } else {
        state.timer = window.setTimeout(tick, DELETE_MS)
      }
    }
  }

  const run = () => {
    clearTimer()
    const el = ensureEl()
    if (!el) {
      if (state.mountRetry < 20) {
        state.mountRetry += 1
        window.setTimeout(run, 150)
      }
      return
    }
    state.mountRetry = 0
    state.el = el
    state.idx = 0
    state.mode = 'typing'
    state.el.classList.remove('is-done')
    state.el.textContent = ''
    tick()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true })
  } else {
    run()
  }

  document.addEventListener('pjax:complete', run)
})()

