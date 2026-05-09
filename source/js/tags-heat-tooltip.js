(() => {
  const isTagsPage = document.querySelector('.page.type-tags')
  if (!isTagsPage) return

  const BAR_SEL = '.page.type-tags #page .tag-cloud-heat__bar'
  const getBars = () => [...document.querySelectorAll(BAR_SEL)]

  const ensureTooltip = () => {
    let el = document.getElementById('acg-tags-heat-tooltip')
    if (el) return el

    el = document.createElement('div')
    el.id = 'acg-tags-heat-tooltip'
    el.className = 'acg-tags-heat-tooltip'
    el.setAttribute('role', 'tooltip')
    el.setAttribute('aria-hidden', 'true')
    document.body.appendChild(el)
    return el
  }

  const fmt = (label, count) => {
    const safeLabel = String(label || '').trim() || '标签'
    const n = Number(count)
    const safeCount = Number.isFinite(n) ? n : 0
    return `<span class="acg-tags-heat-tooltip__label">${safeLabel}</span><span class="acg-tags-heat-tooltip__count">${safeCount} 篇</span>`
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

  const place = (tip, x, y) => {
    const pad = 12
    const rect = tip.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Prefer above cursor; fallback below if near top
    const preferX = x
    const preferY = y - 12 - rect.height
    const belowY = y + 16
    const finalY = preferY < pad ? belowY : preferY

    const left = clamp(preferX - rect.width / 2, pad, vw - rect.width - pad)
    const top = clamp(finalY, pad, vh - rect.height - pad)

    tip.style.transform = `translate3d(${left}px, ${top}px, 0)`
  }

  const show = (tip, bar, e) => {
    const label = bar.getAttribute('data-label') || bar.dataset.label
    const count = bar.getAttribute('data-count') || bar.dataset.count
    tip.innerHTML = fmt(label, count)
    tip.classList.add('is-show')
    tip.setAttribute('aria-hidden', 'false')

    const x = e && typeof e.clientX === 'number' ? e.clientX : (window.innerWidth / 2)
    const y = e && typeof e.clientY === 'number' ? e.clientY : (window.innerHeight / 2)
    place(tip, x, y)
  }

  const hide = (tip) => {
    tip.classList.remove('is-show')
    tip.setAttribute('aria-hidden', 'true')
  }

  const bindBar = (tip, bar) => {
    // Make it focusable for keyboard users
    if (!bar.hasAttribute('tabindex')) bar.setAttribute('tabindex', '0')

    const onEnter = (e) => show(tip, bar, e)
    const onMove = (e) => {
      if (!tip.classList.contains('is-show')) return
      if (!e || typeof e.clientX !== 'number') return
      place(tip, e.clientX, e.clientY)
    }
    const onLeave = () => hide(tip)

    bar.addEventListener('mouseenter', onEnter)
    bar.addEventListener('mousemove', onMove, { passive: true })
    bar.addEventListener('mouseleave', onLeave)

    bar.addEventListener('focus', onEnter)
    bar.addEventListener('blur', onLeave)
  }

  const init = () => {
    const bars = getBars()
    if (!bars.length) return
    const tip = ensureTooltip()
    bars.forEach((bar) => {
      if (bar.__acgTagsHeatBound) return
      bar.__acgTagsHeatBound = true
      bindBar(tip, bar)
    })
  }

  init()
  if (window.btf && typeof window.btf.addGlobalFn === 'function') {
    window.btf.addGlobalFn('pjaxComplete', init, 'acg_tags_heat_tip')
    window.btf.addGlobalFn('themeChange', init, 'acg_tags_heat_tip_theme')
  }
})()

