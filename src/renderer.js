const { apiBridge } = window

const $ = {
  inited: false,
  loopRefresh: false,
  wrapHover: false,
  penetrate: false,
  pointState: false,
  fixedType: null,
  lastPriceData: null,
  lastToolTipData: null,
  setting: {},
  doms: {
    root: document.documentElement,
    wrap: document.querySelector('#app > .price'),
    value: document.querySelector('#app > .price .price-value'),
    raise: document.querySelector('#app > .price .price-raise')
  }
}

const $watch = {
  wrapHover(val) {
    $.doms.wrap.classList[val ? 'add' : 'remove']('is-hover')
  },
  penetrate(val) {
    apiBridge.setPenetrate(val)
  },
  pointState(val) {
    $.doms.root.classList[val == 2 ? 'add' : 'remove']('is-moving')
    if (val == 0 || val == 2) apiBridge.setDragState(val == 2)
  },
  fixedType(val, oval) {
    oval && $.doms.root.classList.remove(`is-fixed-${oval}`)
    val && $.doms.root.classList.add(`is-fixed-${val}`)
  },
  lastToolTipData(val) {
    apiBridge.getPriceInfo({ type: 'text', data: val }).then(res => {
      $.doms.wrap.setAttribute('title', res)
    })
  },
  'setting.priceSource'() {
    $.lastPriceData = null
  },
  'setting.themeStyle'(val = 'default', oval) {
    let cls = $.doms.root.classList
    oval && cls.remove(`theme-${oval}`), val && cls.add(`theme-${val}`)
  },
  'setting.fontSize'(val = '12px') {
    $.doms.root.style.fontSize = val
  },
  'setting.showPriceRaise'(val = true) {
    if (!val && $.doms.raise.textContent) $.doms.raise.textContent = ''
  },
  'setting.showPriceFlash'(val = true) {
    if (!val) $.doms.value.classList.remove('is-up', 'is-down')
  }
}

for (let prop in $watch) {
  let path = prop.split('.')
  let realObj = path.slice(0, -1).reduce((o, k) => o ? o[k] : void 0, $)
  if (!realObj) continue
  let realKey = path.slice(-1), value = realObj[realKey]
  Object.defineProperty(realObj, realKey, {
    configurable: true, enumerable: true, get() { return value },
    set(val) {
      if (val === value) return
      let oval = value; value = val, $watch[prop](val, oval)
    }
  })
}

const resizeObserver = new ResizeObserver(e => {
  let { target } = e[0]
  apiBridge.setContentSize({ width: target.offsetWidth + 12, height: target.offsetHeight + 12 })
})

const updatePrice = async (loop) => {
  let t = updatePrice; clearTimeout(t.timer)
  if (loop != null) $.loopRefresh = !!loop
  if (loop == false) return
  let curTime = Date.now()
  let res = (await apiBridge.getPriceData().catch(() => null)) || {}
  let { pricePrecision = 2, refreshRate = 2000, showPriceRaise = true, showPriceFlash = true } = $.setting
  let prevData = $.lastPriceData || {}
  res._priceValue = (+res.lastPrice || 0).toFixed(pricePrecision)
  res._priceRaise = !showPriceRaise ? '' : `${res.raisePercent > 0 ? '+' : ''}${(res.raisePercent * 100 || 0).toFixed(2)}%`
  if (res._priceValue !== prevData._priceValue) {
    let cls = $.doms.value.classList, txt = $.doms.value.childNodes[0] || $.doms.value
    if (showPriceFlash) {
      if (+res._priceValue > prevData._priceValue) cls.remove('is-down'), cls.add('is-up')
      else if (+res._priceValue < prevData._priceValue) cls.remove('is-up'), cls.add('is-down')
    }
    txt.textContent = res._priceValue
  }
  if (res._priceRaise !== prevData._priceRaise) {
    let cls = $.doms.raise.classList, txt = $.doms.raise.childNodes[0] || $.doms.raise
    if (showPriceFlash) {
      cls.remove('is-up', 'is-down')
      if (res.raisePercent > 0) cls.add('is-up')
      else if (res.raisePercent < 0) cls.add('is-down')
    }
    txt.textContent = res._priceRaise
  }
  $.lastPriceData = res
  if ($.loopRefresh && refreshRate > 0) t.timer = setTimeout(t, Math.max(0, refreshRate + curTime - Date.now()))
}

const checkPointHover = (reset) => {
  let t = checkPointHover; clearTimeout(t.timer)
  t.timer = reset ? null : setInterval(t.fn ||= async () => {
    if ($.penetrate || !await apiBridge.isPointHover({ resetWhen: false })) t(true), $.wrapHover = false
  }, 250)
}

window.addEventListener('pointerup', (e) => {
  if (e.button != 0 && e.button != 1) return
  let hover = e.composedPath().includes($.doms.wrap)
  $.pointState = 0, $.penetrate = !hover, $.wrapHover = hover
})

window.addEventListener('pointerdown', (e) => {
  if (e.button != 0 && e.button != 1) return
  let hover = e.composedPath().includes($.doms.wrap)
  if (hover) $.pointState = 1, $.penetrate = false, $.wrapHover = true
})

window.addEventListener('pointermove', (e) => {
  if ($.pointState == 1) $.pointState = 2, $.fixedType = null
  if ($.pointState == 0) {
    let hover = e.composedPath().includes($.doms.wrap)
    $.penetrate = !hover, $.wrapHover = hover
    if (hover) checkPointHover(), $.lastToolTipData = $.lastPriceData
  }
}, { passive: true })

window.addEventListener('contextmenu', (e) => {
  checkPointHover(true), $.pointState = 0
})

apiBridge.onVisibleChange((event, res) => {
  if (res && !$.inited) {
    $.inited = true
    $.doms.root.removeAttribute('hidden')
    resizeObserver.observe($.doms.wrap)
  }
  updatePrice(res)
})

apiBridge.onSettingChange((event, res) => {
  Object.assign($.setting, res)
  $.loopRefresh && updatePrice()
})

apiBridge.onFixedChange((event, res) => {
  $.fixedType = res
})

if (!$.inited) apiBridge.webInitHandle()
