import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, screen, shell, ipcMain, BrowserWindow, Menu, Tray } from 'electron'
import startup from 'electron-squirrel-startup'
import config from './config.js'

if (startup) app.quit()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const debugEnable = false, cssDragEnable = false
let appWindow, appTray, setting, priceData = null, priceDataChangeTicks = []

const initSetting = () => {
  setting = Object.create(null, {
    // Base props
    $data: {
      writable: true, value: null
    },
    $path: {
      value: path.join(app.getPath('userData'), 'setting.json')
    },
    $get: {
      value(key) {
        let data = this.$data ||= fs.existsSync(this.$path) && JSON.parse(fs.readFileSync(this.$path) || null) || {}
        return key != null ? data[key] : data
      }
    },
    $set: {
      value(key, value) {
        if (key != null) {
          let data = this.$get()
          if (data[key] === value) return
          data[key] = value
        } else {
          this.$data = {}
        }
        this.$save()
      }
    },
    $save: {
      value(sync) {
        let ref = this.$save
        clearTimeout(ref.timer)
        ref.fn ||= () => { this.$data && fs.writeFileSync(this.$path, JSON.stringify(this.$data)) }
        sync ? ref.fn() : (ref.timer = setTimeout(ref.fn, 2000))
      }
    },
    // Data props
    priceSource: {
      enumerable: true,
      get() { return this.$get('priceSource') || config.priceSourceList[0].uniqueCode },
      set(val) {
        let pricePrecision = config.priceSourceList.find(v => v.uniqueCode === val)?.precision ?? 2
        appWindow.webContents.send('config-change', { priceSource: val, pricePrecision })
        this.$set('priceSource', val)
      }
    },
    pricePrecision: {
      enumerable: true,
      get() {
        let { priceSource } = this
        return config.priceSourceList.find(v => v.uniqueCode === priceSource)?.precision ?? 2
      }
    },
    refreshRate: {
      enumerable: true,
      get() { return this.$get('refreshRate') ?? config.refreshRateList.find(v => v.default).time },
      set(val) { appWindow.webContents.send('config-change', { refreshRate: val }), this.$set('refreshRate', val) }
    },
    showPriceRaise: {
      enumerable: true,
      get() { return this.$get('showPriceRaise') ?? true },
      set(val) { appWindow.webContents.send('config-change', { showPriceRaise: val }), this.$set('showPriceRaise', val) }
    },
    clickPenetrate: {
      enumerable: true,
      get() { return this.$get('clickPenetrate') || false },
      set(val) { appWindow.setIgnoreMouseEvents(val), this.$set('clickPenetrate', val) }
    }
  })
}

const createWindow = () => {
  Menu.setApplicationMenu(null)

  appWindow = new BrowserWindow({
    width: 52,
    height: 28,
    x: 0,
    y: screen.getPrimaryDisplay().workAreaSize.height - 40 - 28,
    frame: false,
    focusable: false,
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

  appWindow.loadFile(path.join(__dirname, 'index.html'))

  appWindow.setIgnoreMouseEvents(setting.clickPenetrate)

  cssDragEnable && appWindow.hookWindowMessage && appWindow.hookWindowMessage(278, () => {
    appWindow.setEnabled(false)
    setTimeout(() => appWindow.setEnabled(true), 100)
    createMenu().popup({ window: appWindow })
  })

  appWindow.on('show', () => {
    appWindow.webContents.send('visible-change', true)
  })

  appWindow.on('hide', () => {
    appWindow.webContents.send('visible-change', false)
  })

  appWindow.on('moved', () => {
    setting.$set('position', appWindow.getPosition())
  })

  appWindow.once('ready-to-show', () => {
    let rawPos = setting.$get('position')
    if (rawPos && rawPos.length == 2) {
      let size = appWindow.getSize(), areaSize = screen.getPrimaryDisplay().workAreaSize
      let x = Math.max(0, Math.min(areaSize.width - size[0], rawPos[0] || 0))
      let y = Math.max(0, Math.min(areaSize.height - size[1], rawPos[1] || 0))
      appWindow.setPosition(x, y)
      if (x !== rawPos[0] || y !== rawPos[1]) setting.$set('position', [x, y])
    }

    cssDragEnable || appWindow.webContents.on('context-menu', () => {
      createMenu().popup({ window: appWindow })
    })

    let configKeys = ['priceSource', 'pricePrecision', 'refreshRate', 'showPriceRaise']
    appWindow.webContents.send('config-change', configKeys.reduce((o, k) => (o[k] = setting[k], o), {}))
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
    let x, y, wX, wY, mX, mY, interval
    ipcMain.on('set-drag-state', (event, res) => {
      clearInterval(interval)
      if (res) {
        ;([wX, wY] = appWindow.getPosition(), { x: mX, y: mY } = screen.getCursorScreenPoint())
        interval = setInterval(() => {
          let { x: cX, y: cY } = screen.getCursorScreenPoint()
          let uX = wX + cX - mX, uY = wY + cY - mY
          if (x != uX || y != uY) x = uX, y = uY, appWindow.setPosition(x, y, true)
        }, 16)
      } else if (x != null && y != null) {
        if (x != wX || y != wY) setting.$set('position', [x, y])
        x = y = wX = wY = mX = mY = interval = void 0
      }
    })
  }

  debugEnable && appWindow.webContents.openDevTools({ mode: 'detach' })
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

const createMenu = () => {
  let { priceSource, refreshRate } = setting
  return Menu.buildFromTemplate([
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
      type: 'checkbox', label: item.name, checked: refreshRate === item.time,
      click() { setting.refreshRate = item.time }
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
