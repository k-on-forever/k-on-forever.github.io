(() => {
  // Only show on home page
  const pageType = window.GLOBAL_CONFIG_SITE && window.GLOBAL_CONFIG_SITE.pageType
  if (pageType !== 'home') return

  // Avoid duplicate mounts
  if (document.getElementById('home-weather-clock')) return

  const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches
  if (isCoarsePointer) return

  const defaultFallback = {
    // Beijing, China
    lat: 39.9042,
    lon: 116.4074
  }

  const el = document.createElement('div')
  el.id = 'home-weather-clock'
  // Use theme card styles by sharing `card-widget`
  el.className = 'card-widget home-weather-clock'
  el.innerHTML = `
    <div class="home-weather-clock__head">
      <div class="home-weather-clock__badge">实时天气</div>
      <div class="home-weather-clock__date">--</div>
    </div>

    <div class="home-weather-clock__top">
      <div class="home-weather-clock__weather">
        <div class="home-weather-clock__icon-wrap">
          <div class="home-weather-clock__emoji" aria-hidden="true">--</div>
          <div class="home-weather-clock__label">--</div>
        </div>
      </div>

      <div class="home-weather-clock__stats">
        <div class="home-weather-clock__temp">
          <span class="home-weather-clock__temp-value">--</span><span class="home-weather-clock__temp-unit">°C</span>
        </div>
        <div class="home-weather-clock__humid">湿度 <span class="home-weather-clock__humid-value">--</span>%</div>
      </div>
    </div>

    <div class="home-weather-clock__time" aria-label="当前时间">--:--:--</div>

    <div class="home-weather-clock__meta">
      <div class="home-weather-clock__chip">
        <span class="home-weather-clock__chip-key">风向</span>
        <span class="home-weather-clock__chip-value">
          <span class="home-weather-clock__wind-arrow" aria-hidden="true">▲</span>
          <span class="home-weather-clock__wind-dir">--</span>
        </span>
      </div>
      <div class="home-weather-clock__chip">
        <span class="home-weather-clock__chip-key">天气代码</span>
        <span class="home-weather-clock__chip-value home-weather-clock__code-value">--</span>
      </div>
    </div>
  `

  const recentCard = document.querySelector('.card-widget.card-recent-post')
  if (recentCard && recentCard.parentNode) {
    recentCard.insertAdjacentElement('beforebegin', el)
  } else {
    // Fallback: keep it visible if theme changes
    document.body.appendChild(el)
  }

  const $emoji = el.querySelector('.home-weather-clock__emoji')
  const $label = el.querySelector('.home-weather-clock__label')
  const $date = el.querySelector('.home-weather-clock__date')
  const $tempValue = el.querySelector('.home-weather-clock__temp-value')
  const $humidValue = el.querySelector('.home-weather-clock__humid-value')
  const $time = el.querySelector('.home-weather-clock__time')
  const $windArrow = el.querySelector('.home-weather-clock__wind-arrow')
  const $windDir = el.querySelector('.home-weather-clock__wind-dir')
  const $codeValue = el.querySelector('.home-weather-clock__code-value')

  const pad2 = n => String(n).padStart(2, '0')

  const updateClock = () => {
    const d = new Date()
    $time.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    $date.textContent = `${d.getMonth() + 1}月${d.getDate()}日 ${weekMap[d.getDay()]}`
  }

  updateClock()
  setInterval(updateClock, 1000)

  // Wind direction degree -> 8 compass (N, NE, ...), with Chinese labels.
  const windDirTextZh8 = deg => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const idx = Math.round(((deg % 360) / 45)) % 8
    const dir = dirs[idx]
    const zh = {
      N: '北风',
      NE: '东北风',
      E: '东风',
      SE: '东南风',
      S: '南风',
      SW: '西南风',
      W: '西风',
      NW: '西北风'
    }
    // Keep output short-ish; if you prefer "北风/东风..." only,
    // we can switch to 4-direction later.
    return zh[dir] || '…'
  }

  const setLoading = () => {
    $emoji.textContent = '--'
    $label.textContent = '--'
    $windDir.textContent = '--'
    $tempValue.textContent = '--'
    $humidValue.textContent = '--'
    $codeValue.textContent = '--'
  }

  const weatherMeta = code => {
    // open-meteo `weather_code` mapping (current conditions)
    // https://open-meteo.com/en/docs#weather-code
    // Returns { emoji, label }
    if (code === 0) return { emoji: '☀️', label: '晴' }
    if (code === 1) return { emoji: '🌤️', label: '晴间多云' }
    if (code === 2) return { emoji: '⛅', label: '多云' }
    if (code === 3) return { emoji: '☁️', label: '阴天' }
    if (code === 45 || code === 48) return { emoji: '🌫️', label: '雾霾' }

    // Drizzle
    if (code >= 51 && code <= 57) return { emoji: '🌦️', label: code <= 55 ? '毛毛雨' : '冻毛毛雨' }

    // Rain
    if (code >= 61 && code <= 63) return { emoji: '🌧️', label: code === 61 ? '小雨' : '中雨' }
    if (code === 65) return { emoji: '🌧️', label: '大雨' }
    if (code === 66 || code === 67) return { emoji: '🌧️', label: '冻雨' }

    // Snow
    if (code >= 71 && code <= 75) {
      return { emoji: '❄️', label: code === 71 ? '小雪' : code === 73 ? '中雪' : '大雪' }
    }
    if (code === 77) return { emoji: '❄️', label: '雪粒' }

    // Rain showers
    if (code >= 80 && code <= 82) {
      const label = code === 80 ? '小阵雨' : code === 81 ? '阵雨' : '大阵雨'
      return { emoji: '🌦️', label }
    }
    if (code === 85 || code === 86) return { emoji: '🌨️', label: '雨夹雪/雪阵雨' }

    if (code >= 95) return { emoji: '⛈️', label: code >= 99 ? '雷雨伴随冰雹' : '雷阵雨' }

    return { emoji: '🌡️', label: '其他' }
  }

  const applyWeather = data => {
    const cur = data && data.current
    if (!cur) return

    const temp = cur.temperature_2m
    const humid = cur.relative_humidity_2m
    const windSpeed = cur.wind_speed_10m // m/s
    const windDir = cur.wind_direction_10m // degrees
    const code = cur.weather_code

    if (typeof temp === 'number') $tempValue.textContent = Math.round(temp)
    if (typeof humid === 'number') $humidValue.textContent = Math.round(humid)

    if (typeof windDir === 'number') {
      $windArrow.style.transform = `rotate(${windDir}deg)`
      $windDir.textContent = windDirTextZh8(windDir)
    } else {
      $windArrow.style.transform = 'rotate(0deg)'
      $windDir.textContent = '--'
    }

    if (typeof code === 'number') {
      const meta = weatherMeta(code)
      $emoji.textContent = meta.emoji
      $label.textContent = meta.label
      $codeValue.textContent = String(code)
    } else {
      $emoji.textContent = '🌡️'
      $label.textContent = '天气'
      $codeValue.textContent = '--'
    }

    // Optional: you can show windSpeed. For now we keep layout clean.
    void windSpeed
  }

  const fetchWeather = async (lat, lon) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=auto`
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) throw new Error(`weather request failed: ${res.status}`)
    return res.json()
  }

  const run = async latLon => {
    setLoading()
    try {
      const data = await fetchWeather(latLon.lat, latLon.lon)
      applyWeather(data)
    } catch (e) {
      // If API fails, keep UI stable with "--"
      // eslint-disable-next-line no-console
      console.warn('[home-weather-clock] Failed:', e)
    }
  }

  const requestGeo = () => {
    if (!('geolocation' in navigator)) return Promise.resolve(defaultFallback)

    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(defaultFallback),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      )
    })
  }

  requestGeo()
    .then(run)
    .catch(() => run(defaultFallback))

  // Refresh weather every 15 minutes
  setInterval(() => requestGeo().then(run), 15 * 60 * 1000)
})()

