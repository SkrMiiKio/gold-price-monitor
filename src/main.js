import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, screen, shell, ipcMain, nativeTheme, BrowserWindow, Menu, Tray } from 'electron'
import startup from 'electron-squirrel-startup'
import { getGoldPrice } from './api.js'
import config from './config.js'

if (startup) app.quit()

const DIRNAME = path.dirname(fileURLToPath(import.meta.url))
const DEBUG_ENABLE = process.env.DEBUG_ENABLE === 'true'

let appWindow, appTray, setting, showDeviceScaleOption
let wrapMargin = 6, lastContentSize = [60, 40], lastPriceData = null

const priceSourceFlatList = (
  (function _flat(res, list) {
    for (let item of list) item.children ? _flat(res, item.children) : res.push(item)
    return res
  })([], config.priceSourceList)
)

const initSetting = () => {
  let data = null
  let dataPath = path.join(app.getPath('userData'), 'setting.json')
  let dataDesc = {}
  let dataProto = {
    $get(key) {
      data || this.$init()
      return key != null ? data[key] : data
    },
    $set(key, value) {
      if (key != null) {
        data || this.$init()
        let { default: defVal, writable = true, checkable = true, beforeSet, afterSet } = dataConfig[key] || {}
        if (!writable || checkable && !this.$check(key, value)) return
        if (value === void 0) value = typeof defVal == 'function' ? defVal.call(this) : defVal
        if (typeof beforeSet == 'function' && beforeSet.call(this, value) === false) return
        if (JSON.stringify(data[key]) !== JSON.stringify(value)) data[key] = value, this.$save()
        if (typeof afterSet == 'function') afterSet.call(this, value)
      } else if (value != null) {
        this.$init(value)
        this.$save()
      }
    },
    $check(key, value) {
      if (key == null) return false
      let { type, enums } = dataConfig[key] || {}
      return (!type || [].concat(type).includes(Object.prototype.toString.call(value).slice(8, -1))) && (!enums || enums.includes(value))
    },
    $init(map) {
      try {
        map ||= fs.existsSync(dataPath) && JSON.parse(fs.readFileSync(dataPath) || null)
        data = typeof map == 'object' && map || {}
        for (let key in dataConfig) {
          if (data[key] !== void 0 && this.$check(key, data[key])) continue
          let defVal = dataConfig[key].default
          data[key] = typeof defVal == 'function' ? defVal.call(this) : defVal
        }
      } catch (e) {
        data = {}
      }
    },
    $save(sync) {
      let ref = this.$save
      clearTimeout(ref.timer)
      ref.fn ||= () => { data && fs.writeFileSync(dataPath, JSON.stringify(data)) }
      sync ? ref.fn() : (ref.timer = setTimeout(ref.fn, 2000))
    }
  }
  let dataConfig = {
    priceSource: {
      enums: priceSourceFlatList.map(v => v.uniqueCode),
      default: priceSourceFlatList[0].uniqueCode,
      beforeSet(val) {
        let pricePrecision = priceSourceFlatList.find(v => v.uniqueCode === val).precision
        appWindow.webContents.send('setting-change', { priceSource: val, pricePrecision })
      }
    },
    pricePrecision: {
      writable: false,
      get() {
        let { priceSource } = this
        return priceSourceFlatList.find(v => v.uniqueCode === priceSource).precision
      }
    },
    refreshRate: {
      enums: config.refreshRateList.map(v => v.value),
      default: config.refreshRateList.find(v => v.default).value,
      beforeSet(val) {
        appWindow.webContents.send('setting-change', { refreshRate: val })
      }
    },
    themeStyle: {
      enums: config.themeStyleList.map(v => v.value),
      default: config.themeStyleList.find(v => v.default).value,
      beforeSet(val) {
        appWindow.webContents.send('setting-change', { themeStyle: val })
      },
      afterSet() {
        nativeTheme.themeSource = this.themeNative
      }
    },
    themeNative: {
      writable: false,
      get() {
        let { themeStyle } = this
        return config.themeStyleList.find(v => v.value === themeStyle).native || 'system'
      }
    },
    fontSize: {
      enums: config.fontSizeList.map(v => v.value),
      default: config.fontSizeList.find(v => v.default).value,
      beforeSet(val) {
        appWindow.webContents.send('setting-change', { fontSize: val })
      }
    },
    showPriceRaise: {
      type: 'Boolean',
      default: true,
      beforeSet(val) {
        appWindow.webContents.send('setting-change', { showPriceRaise: val })
      }
    },
    showPriceFlash: {
      type: 'Boolean',
      default: true,
      beforeSet(val) {
        appWindow.webContents.send('setting-change', { showPriceFlash: val })
      }
    },
    disableDeviceScale: {
      type: 'Boolean',
      default: false,
      afterSet(val) {
        let set = app.commandLine.getSwitchValue('force-device-scale-factor') == 1 ? (val ? null : false) : (val ? true : null)
        if (set != null) app.relaunch(), app.quit()
      }
    },
    position: {
      type: 'Object',
      enumerable: false
    }
  }

  for (let key in dataConfig) {
    let { get, set, configurable = false, enumerable = true, writable = true } = dataConfig[key]
    if (typeof get != 'function') get = get === false ? void 0 : function () { return this.$get(key) }
    if (typeof set != 'function') set = set === false || !writable ? void 0 : function (val) { this.$set(key, val) }
    dataDesc[key] = { configurable, enumerable, get, set }
  }

  setting = Object.create(dataProto, dataDesc)

  if (setting.disableDeviceScale) app.commandLine.appendSwitch('force-device-scale-factor', '1')
}

const createWindow = () => {
  Menu.setApplicationMenu(null)

  let display = screen.getPrimaryDisplay()

  appWindow = new BrowserWindow({
    width: lastContentSize[0],
    height: lastContentSize[1],
    x: display.workArea.x,
    y: display.workArea.y,
    frame: false,
    focusable: true,
    resizable: false,
    hasShadow: false,
    thickFrame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#0000',
    webPreferences: {
      preload: path.join(DIRNAME, 'preload.js'),
      sandbox: true
    }
  })

  showDeviceScaleOption = setting.disableDeviceScale || display.scaleFactor != 1

  nativeTheme.themeSource = setting.themeNative

  appWindow.loadFile(path.join(DIRNAME, 'index.html'))

  appWindow.on('show', () => {
    appWindow.webContents.send('visible-change', true)
  })

  appWindow.on('hide', () => {
    appWindow.webContents.send('visible-change', false)
  })

  appWindow.on('moved', () => {
    let [x, y] = appWindow.getPosition(), { dpi = screen.getPrimaryDisplay().scaleFactor } = setting.position || {}
    setting.position = { x, y, dpi }
  })

  appWindow.once('ready-to-show', () => {
    appWindow.isReady = true
    appWindow.webContents.on('context-menu', (event) => {
      event.preventDefault()
      createMenu({ popup: true, popupCallback: () => { appWindow.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', x: 0, y: 0 }) } })
    })
    initPosition(setting.position || { x: 'left', y: 'bottom' })
  })

  ipcMain.handle('is-visible', () => {
    return appWindow.isVisible()
  })

  ipcMain.handle('is-point-hover', (event, res) => {
    let { resetWhen } = res || {}, hover = isPonitHover()
    if (hover === resetWhen) appWindow.setEnabled(false), setTimeout(() => appWindow.setEnabled(true), 100)
    return hover
  })

  ipcMain.handle('get-price-data', (event, res) => {
    return getPriceData(res)
  })

  ipcMain.handle('get-price-info', (event, res) => {
    return getPriceInfo(res)
  })

  ipcMain.on('web-init-handle', () => {
    appWindow.webContents.send('setting-change', { ...setting })
    appWindow.webContents.send('visible-change', appWindow.isVisible())
  })

  ipcMain.on('set-content-size', (event, res) => {
    let [lw, lh] = lastContentSize, { width = lw, height = lh } = res
    if (width === lw && height === lh) return
    appWindow.setContentSize(width, height), lastContentSize = [width, height]
    appWindow.isReady && initPosition(setting.position)
  })

  ipcMain.on('set-penetrate', (event, res) => {
    let { valid, forward = !!valid } = typeof res == 'object' && res || { valid: res }
    appWindow.setIgnoreMouseEvents(valid, { forward })
  })

  ;{
    let bS, bP, mP, tP, area, dpi, interval, delay = 16
    ipcMain.on('set-drag-state', function setDragState(event, res) {
      clearInterval(interval)
      if (res) {
        ;({ workArea: area, scaleFactor: dpi } = screen.getPrimaryDisplay())
        bS = lastContentSize.concat()
        bP = appWindow.getPosition()
        mP = screen.getCursorScreenPoint()
        interval = setInterval(() => {
          let cP = screen.getCursorScreenPoint(), uP = { x: bP[0] + cP.x - mP.x, y: bP[1] + cP.y - mP.y }
          if (tP && tP.x == uP.x && tP.y == uP.y) return
          tP = uP, appWindow.setContentBounds({ x: tP.x, y: tP.y, width: bS[0], height: bS[1] }, true)
          if (!(cP.x >= tP.x && cP.x <= tP.x + bS[0] && cP.y >= tP.y && cP.y <= tP.y + bS[1])) setDragState(null, false)
        }, delay)
      } else if (tP) {
        bS = bP = mP = tP = dpi = interval = void 0, initPosition()
      }
    })
  }

  if (DEBUG_ENABLE) appWindow.webContents.openDevTools({ mode: 'detach' })
}

const createTray = () => {
  appTray = new Tray(path.join(DIRNAME, 'assets/icon.ico'))

  appTray.on('click', () => {
    appWindow.isVisible() || appWindow.show()
  })

  appTray.on('right-click', () => {
    appTray.popUpContextMenu(createMenu({ isTray: true }))
  })

  appTray.on('mouse-enter', async () => {
    let data = lastPriceData || await getPriceData().catch(() => null)
    let text = getPriceInfo({ type: 'text', data })
    appTray.setToolTip(`- 金价实时监控 -${text ? `\n${text}` : ''}`)
  })
}

const createMenu = (options) => {
  let { popup = false, isTray = false, inWindow = true, popupCallback } = options || {}
  if (popup && inWindow && !isPonitHover()) return
  let { priceSource, refreshRate, themeStyle, fontSize } = setting, isOpenAtLogin
  let menu = Menu.buildFromTemplate([
    { label: '价格来源', submenu: [
      ...(function _flat(res, list) {
        for (let item of list) res.push(item.children
          ? { label: item.name, submenu: _flat([], item.children) }
          : {
            type: 'checkbox', label: item.name, checked: priceSource === item.uniqueCode,
            click() { setting.priceSource = item.uniqueCode }
          })
        return res
      })([], config.priceSourceList),
      { type: 'separator' },
      { label: '查看更多', click() { shell.openExternal(config.priceSourceUrl) } }
    ] },
    { label: '刷新频率', submenu: config.refreshRateList.map(item => ({
      type: 'checkbox', label: item.name, checked: refreshRate === item.value,
      click() { setting.refreshRate = item.value }
    })) },
    { label: '主题样式', submenu: config.themeStyleList.map(item => ({
      type: 'checkbox', label: item.name, checked: themeStyle === item.value,
      click() { setting.themeStyle = item.value }
    })) },
    { label: '字体大小', submenu: [
        ...config.fontSizeList.map(item => ({
          type: 'checkbox', label: item.name, checked: fontSize === item.value,
          click() { setting.fontSize = item.value }
        })),
        ...showDeviceScaleOption ? [
          { type: 'separator' },
          { label: '禁用布局缩放', type: 'checkbox', checked: setting.disableDeviceScale,
            toolTip: '禁用后应用将按照100%的布局缩放大小显示',
            click() { setting.disableDeviceScale = !setting.disableDeviceScale }
          }
        ] : []
      ]
    },
    { label: '显示涨跌', type: 'checkbox', checked: setting.showPriceRaise,
      click() { setting.showPriceRaise = !setting.showPriceRaise }
    },
    { label: '浮动闪烁', type: 'checkbox', checked: setting.showPriceFlash,
      click() { setting.showPriceFlash = !setting.showPriceFlash }
    },
    ...isTray ? [
      { label: '开机自启', type: 'checkbox', checked: (isOpenAtLogin = app.getLoginItemSettings().openAtLogin),
        click() { app.setLoginItemSettings({ openAtLogin: !isOpenAtLogin }) }
      },
      { label: '关于', submenu: [
        { label: '项目主页', click() { shell.openExternal(config.homepageUrl) } },
        { label: '版本更新', click() { shell.openExternal(config.releasesUrl) } }
      ]
    }] : [],
    appWindow.isVisible()
      ? { label: '隐藏', click() { appWindow.hide() } }
      : { label: '显示', click() { appWindow.show() } },
    { label: '退出', role: 'quit' }
  ])
  if (popup) {
    if (!appWindow.isFocusable()) {
      let cb = popupCallback
      popupCallback = () => { appWindow.setFocusable(false), cb && cb() }
      appWindow.setFocusable(true), appWindow.setSkipTaskbar(true), appWindow.focus()
    }
    menu.popup({ window: appWindow, callback: popupCallback })
  }
  return menu
}

const initPosition = (options) => {
  let { x, y, dpi } = options || {}, bounds = appWindow.getBounds(), { workArea, scaleFactor } = screen.getPrimaryDisplay()
  let useDpi = isFinite(dpi) ? dpi : scaleFactor
  let realX = isFinite(x) ? x * (useDpi / scaleFactor) : bounds.x
  let realY = isFinite(y) ? y * (useDpi / scaleFactor) : bounds.y
  let minX = workArea.x - wrapMargin, maxX = workArea.x + workArea.width - bounds.width + wrapMargin
  let minY = workArea.y - wrapMargin, maxY = workArea.y + workArea.height - bounds.height + wrapMargin
  let varX = '', useX = Math.floor(
    x == 'left' || x == 'fixed-left' ? (varX = x, minX) :
    x == 'right' || x == 'fixed-right' ? (varX = x, maxX) :
    realX <= minX - Math.min(32 + wrapMargin, bounds.width / 2) ? (varX = 'fixed-left', minX) :
    realX >= maxX + Math.min(32 + wrapMargin, bounds.width / 2) ? (varX = 'fixed-right', maxX) :
    realX <= minX ? (varX = 'left', minX) :
    realX >= maxX ? (varX = 'right', maxX) :
    Math.max(minX, Math.min(maxX, realX))
  )
  let varY = '', useY = Math.floor(
    y == 'top' || y == 'fixed-top' ? (varY = y, minY) :
    y == 'bottom' || y == 'fixed-bottom' ? (varY = y, maxY) :
    realY <= minY - Math.min(32 + wrapMargin, bounds.height / 2) ? (varY = 'fixed-top', minY) :
    realY >= maxY + Math.min(32 + wrapMargin, bounds.height / 2) ? (varY = 'fixed-bottom', maxY) :
    realY <= minY ? (varY = 'top', minY) :
    realY >= maxY ? (varY = 'bottom', maxY) :
    Math.max(minY, Math.min(maxY, realY))
  )
  if (useX !== bounds.x || useY !== bounds.y) appWindow.setPosition(useX, useY)
  setting.position = { x: varX || useX, y: varY || useY, dpi: useDpi }
  let fixedType = (varX.includes('fixed') ? varX : varY.includes('fixed') ? varY : '').slice(6)
  if (fixedType) appWindow.webContents.send('fixed-change', fixedType)
}

const isPonitHover = () => {
  let b = appWindow.getBounds(), p = screen.getCursorScreenPoint()
  return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height
}

const getPriceData = async () => {
  let res = await getGoldPrice(setting.priceSource)
  return (lastPriceData = res && (res.data || res.datas) || null)
}

const getPriceInfo = (options) => {
  let { type = 'list', data = lastPriceData } = options || {}; data ||= {}
  let { priceSource, pricePrecision: pc } = setting
  let res = [
    { label: '当前来源', value: data.name || priceSourceFlatList.find(v => v.uniqueCode === priceSource)?.name || '' },
    { label: '当前价格', value: data.lastPrice != null ? (+data.lastPrice).toFixed(pc) : '' },
    { label: '当日涨跌幅', value: [
        data.raise != null ? `${data.raise > 0 ? '+' : ''}${(+data.raise).toFixed(pc)}` : '',
        data.raisePercent != null ? `${data.raisePercent > 0 ? '+' : ''}${(+data.raisePercent * 100).toFixed(2)}%` : ''
      ].filter(Boolean).join('  ')
    },
    { label: '当日最高价', value: data.highPrice != null ? (+data.highPrice).toFixed(pc) : '' },
    { label: '当日最低价', value: data.lowPrice != null ? (+data.lowPrice).toFixed(pc) : '' },
    { label: '当日开盘价', value: data.openPrice != null ? (+data.openPrice).toFixed(pc) : '' },
    { label: '上日收盘价', value: data.preClose != null ? (+data.preClose).toFixed(pc) : '' },
    { label: '更新时间', value: data.tradeDateTime != null ? [
        ['year', 'monthValue', 'dayOfMonth'].map(v => String(data.tradeDateTime[v] || 0).padStart(2, '0')).join('-'),
        ['hour', 'minute', 'second'].map(v => String(data.tradeDateTime[v] || 0).padStart(2, '0')).join(':')
      ].join(' ') : ''
    }
  ]
  if (type == 'text' || type == 'list-no-empty') res = res.filter(v => v.value)
  if (type == 'text') res = res.map(v => `${v.label}：${v.value}`).join('\n')
  return res
}

initSetting()

app.whenReady().then(() => {
  createWindow()
  createTray()
})

app.on('before-quit', () => {
  setting?.$save(true)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
