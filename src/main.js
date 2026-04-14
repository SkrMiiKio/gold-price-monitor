import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, screen, shell, ipcMain, nativeTheme, BrowserWindow, Menu, Tray } from 'electron'
import startup from 'electron-squirrel-startup'
import config from './config.js'

if (startup) app.quit()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const debugEnable = false, cssDragEnable = false
let appWindow, appTray, setting, priceData = null, priceDataChangeTicks = []

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
        let { default: defVal, writable = true, checkable = true, beforeSet } = dataConfig[key] || {}
        if (!writable || checkable && !this.$check(key, value)) return
        if (value === void 0) value = typeof defVal == 'function' ? defVal.call(this) : defVal
        if (typeof beforeSet == 'function' && beforeSet.call(this, value) === false) return
        if (data[key] !== value) data[key] = value, this.$save()
      } else if (value != null) {
        this.$init(value)
        this.$save()
      }
    },
    $check(key, value) {
      if (key == null) return false
      let { type, enums } = dataConfig[key] || {}
      if (type != null && !Array.isArray(type)) type = [type]
      return (
        (!type || value !== null && type.some(v => typeof v == 'string' ? typeof value === v : value instanceof v)) &&
        (!enums || enums.includes(value))
      )
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
      default: config.priceSourceList[0].uniqueCode,
      enums: config.priceSourceList.map(v => v.uniqueCode),
      beforeSet(val) {
        let pricePrecision = config.priceSourceList.find(v => v.uniqueCode === val).precision
        appWindow.webContents.send('setting-change', { priceSource: val, pricePrecision })
      }
    },
    pricePrecision: {
      writable: false,
      get() {
        let { priceSource } = this
        return config.priceSourceList.find(v => v.uniqueCode === priceSource).precision
      }
    },
    refreshRate: {
      default: config.refreshRateList.find(v => v.default).value,
      enums: config.refreshRateList.map(v => v.value),
      beforeSet(val) {
        appWindow.webContents.send('setting-change', { refreshRate: val })
      }
    },
    themeStyle: {
      default: config.themeStyleList.find(v => v.default).value,
      enums: config.themeStyleList.map(v => v.value),
      beforeSet(val) {
        nativeTheme.themeSource = val
        appWindow.webContents.send('setting-change', { themeStyle: val })
      }
    },
    showPriceRaise: {
      type: 'boolean',
      default: true,
      beforeSet(val) {
        appWindow.webContents.send('setting-change', { showPriceRaise: val })
      }
    },
    clickPenetrate: {
      type: 'boolean',
      default: false,
      beforeSet(val) {
        appWindow.setIgnoreMouseEvents(val)
      }
    },
    position: {
      type: Array,
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
}

const createWindow = () => {
  Menu.setApplicationMenu(null)

  appWindow = new BrowserWindow({
    width: 52 + 12,
    height: 28 + 12,
    x: 0,
    y: screen.getPrimaryDisplay().workAreaSize.height - 40 - (28 + 12),
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
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true
    }
  })

  nativeTheme.themeSource = setting.themeStyle

  appWindow.setIgnoreMouseEvents(setting.clickPenetrate)

  appWindow.loadFile(path.join(__dirname, 'index.html'))

  cssDragEnable && appWindow.hookWindowMessage && appWindow.hookWindowMessage(278, () => {
    appWindow.setEnabled(false)
    setTimeout(() => appWindow.setEnabled(true), 100)
    createMenu({ popup: true })
  })

  appWindow.on('show', () => {
    appWindow.webContents.send('visible-change', true)
  })

  appWindow.on('hide', () => {
    appWindow.webContents.send('visible-change', false)
  })

  appWindow.on('moved', () => {
    setting.position = appWindow.getPosition()
  })

  appWindow.once('ready-to-show', () => {
    let rawPos = setting.position
    if (rawPos && rawPos.length == 2) {
      let size = appWindow.getSize(), areaSize = screen.getPrimaryDisplay().workAreaSize
      let x = Math.max(0, Math.min(areaSize.width - size[0], rawPos[0] || 0))
      let y = Math.max(0, Math.min(areaSize.height - size[1], rawPos[1] || 0))
      appWindow.setPosition(x, y)
      if (x !== rawPos[0] || y !== rawPos[1]) setting.position = [x, y]
    }

    cssDragEnable || appWindow.webContents.on('context-menu', (event) => {
      event.preventDefault()
      createMenu({ popup: true })
    })

    appWindow.webContents.send('setting-change', { ...setting })
    appWindow.webContents.send('visible-change', appWindow.isVisible())
  })

  ipcMain.handle('is-visible', () => {
    return appWindow.isVisible()
  })

  ipcMain.handle('is-use-css-drag', () => {
    return cssDragEnable
  })

  ipcMain.handle('get-price-info', (event, res) => {
    return getPriceInfo(res)
  })

  ipcMain.on('set-price-data', (event, res) => {
    priceData = res || null
    if (priceDataChangeTicks.length) {
      priceDataChangeTicks.forEach(e => e(priceData))
      priceDataChangeTicks.splice(0, Infinity)
    }
  })

  ipcMain.on('set-content-size', (event, res) => {
    let size = appWindow.getSize()
    appWindow.setContentSize(res.width || size[0], res.height || size[1])
  })

  if (!cssDragEnable) {
    let pos, wX, wY, mX, mY, interval, delay = 16
    ipcMain.on('set-drag-state', (event, res) => {
      clearInterval(interval)
      if (res) {
        ;([wX, wY] = appWindow.getPosition(), { x: mX, y: mY } = screen.getCursorScreenPoint())
        interval = setInterval(() => {
          let { x: cX, y: cY } = screen.getCursorScreenPoint()
          let uPos = [wX + cX - mX, wY + cY - mY]
          if (!pos || pos[0] != uPos[0] || pos[1] != uPos[1]) pos = uPos, appWindow.setPosition(pos[0], pos[1], true)
        }, delay)
      } else if (pos) {
        if (pos[0] != wX || pos[1] != wY) setting.position = pos
        pos = wX = wY = mX = mY = interval = void 0
      }
    })
  }

  if (debugEnable) appWindow.webContents.openDevTools({ mode: 'detach' })
}

const createTray = () => {
  appTray = new Tray(path.join(__dirname, 'assets/icon.ico'))

  appTray.on('click', () => {
    appWindow.isVisible() || appWindow.show()
  })

  appTray.on('right-click', () => {
    appTray.popUpContextMenu(createMenu())
  })

  let setToolTip = (data) => {
    let text = getPriceInfo({ type: 'text', data })
    appTray.setToolTip(`- 金价实时监控 -${text ? `\n${text}` : ''}`)
  }
  appTray.on('mouse-enter', () => {
    priceDataChangeTicks.push(setToolTip)
    appWindow.webContents.send('get-price-data')
  })
}

const createMenu = (options) => {
  let { popup = false, inWindow = true } = options || {}
  if (popup && inWindow) {
    let size = appWindow.getSize(), wPos = appWindow.getPosition(), mPos = screen.getCursorScreenPoint()
    if (!(mPos.x >= wPos[0] && mPos.x <= wPos[0] + size[0] && mPos.y >= wPos[1] && mPos.y <= wPos[1] + size[1])) return
  }
  let { priceSource, refreshRate, themeStyle } = setting
  let menu = Menu.buildFromTemplate([
    appWindow.isVisible()
      ? { label: '隐藏', click() { appWindow.hide() } }
      : { label: '显示', click() { appWindow.show() } },
    { label: '价格来源', submenu: [
      ...config.priceSourceList.map(item => ({
        type: 'checkbox', label: item.name, checked: priceSource === item.uniqueCode,
        click() { setting.priceSource = item.uniqueCode }
      })),
      { type: 'separator' },
      { label: '查看更多', click() { shell.openExternal(config.sourceDetailUrl) } }
    ] },
    { label: '刷新频率', submenu: config.refreshRateList.map(item => ({
      type: 'checkbox', label: item.name, checked: refreshRate === item.value,
      click() { setting.refreshRate = item.value }
    })) },
    { label: '主题样式', submenu: config.themeStyleList.map(item => ({
      type: 'checkbox', label: item.name, checked: themeStyle === item.value,
      click() { setting.themeStyle = item.value }
    })) },
    { label: '显示增减', type: 'checkbox', checked: setting.showPriceRaise,
      click() { setting.showPriceRaise = !setting.showPriceRaise }
    },
    { label: '点击穿透', type: 'checkbox', checked: setting.clickPenetrate,
      click() { setting.clickPenetrate = !setting.clickPenetrate }
    },
    { label: '开机自启', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click() { app.setLoginItemSettings({ openAtLogin: !app.getLoginItemSettings().openAtLogin }) }
    },
    { label: '退出', role: 'quit' }
  ])
  if (popup) {
    let focusable = appWindow.isFocusable()
    if (!focusable) appWindow.setFocusable(true), appWindow.setSkipTaskbar(true), appWindow.focus()
    menu.popup({ window: appWindow, callback: focusable ? void 0 : () => appWindow.setFocusable(false) })
  }
  return menu
}

const getPriceInfo = (options) => {
  let { type = 'list', data = priceData } = options || {}; data ||= {}
  let { priceSource, pricePrecision: pc } = setting
  let res = [
    { label: '当前来源', value: data.name || config.priceSourceList.find(v => v.uniqueCode === priceSource)?.name || '' },
    { label: '当前价格', value: data.lastPrice != null ? (+data.lastPrice).toFixed(pc) : '' },
    { label: '价格增减', value: [
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

app.whenReady().then(() => {
  initSetting()
  createWindow()
  createTray()
})

app.on('before-quit', () => {
  setting && setting.$save(true)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
