const fs = require('node:fs')
const path = require('node:path')
const { app, screen, shell, ipcMain, BrowserWindow, Menu, Tray } = require('electron')

if (require('electron-squirrel-startup')) app.quit()

let appWindow, appTray

const setting = {
  path: path.join(app.getPath('userData'), 'setting.json'),
  get(key) {
    let data = setting.data ||= fs.existsSync(setting.path) && JSON.parse(fs.readFileSync(setting.path) || null) || {}
    return key != null ? data[key] : data
  },
  set(key, value) {
    let data = key != null ? setting.get() : {}
    if (key != null) data[key] = value
    if (setting.data !== data) setting.data = data
    setting.save()
  },
  save() {
    clearTimeout(setting.save.timer)
    setting.save.fn ||= () => fs.writeFileSync(setting.path, JSON.stringify(setting.data || {}))
    setting.save.timer = setTimeout(setting.save.fn, 2000)
  }
}

const createWindow = () => {
  Menu.setApplicationMenu(null)

  appWindow = new BrowserWindow({
    width: 48,
    height: 30,
    x: 0,
    y: screen.getPrimaryDisplay().workAreaSize.height - 40 - 30,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  appWindow.loadFile(path.join(__dirname, 'index.html'))

  Object.defineProperty(appWindow, 'isClickPenetrate', {
    enumerable: true,
    get() { return !!setting.get('isClickPenetrate') },
    set(val) { appWindow.setIgnoreMouseEvents(!!val), setting.set('isClickPenetrate', !!val) }
  })
  appWindow.setIgnoreMouseEvents(appWindow.isClickPenetrate)

  appWindow.hookWindowMessage(278, () => {
    appWindow.setEnabled(false)
    setTimeout(() => appWindow.setEnabled(true), 100)
  })

  appWindow.on('show', () => {
    appWindow.webContents.send('window-visible-change', true)
  })

  appWindow.on('hide', () => {
    appWindow.webContents.send('window-visible-change', false)
  })

  ipcMain.handle('is-window-visible', () => appWindow.isVisible())

  // appWindow.webContents.openDevTools()
}

const createTray = () => {
  appTray = new Tray(path.join(__dirname, 'assets/icon.ico'))

  const popUpContextMenu = () => {
    appTray.popUpContextMenu(Menu.buildFromTemplate([
      { label: appWindow.isVisible() ? '隐藏' : '显示',
        click: () => { appWindow[appWindow.isVisible() ? 'hide' : 'show']() }
      },
      { label: '点击穿透', type: 'checkbox', checked: appWindow.isClickPenetrate,
        click: () => { appWindow.isClickPenetrate = !appWindow.isClickPenetrate }
      },
      { label: '开机自启', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
        click: () => { app.setLoginItemSettings({ openAtLogin: !app.getLoginItemSettings().openAtLogin }) }
      },
      { label: '金价来源', click: () => { shell.openExternal('https://m.jr.jd.com/finance-gold/msjgold/homepage') } },
      { label: '退出', click: () => { app.quit() } }
    ]))
  }
  const updateToolTip = async () => {
    let res = await fetch('https://ms.jr.jd.com/gw/generic/hj/h5/m/latestPrice').then(e => e.json(), e => e)
    appTray.setToolTip(`实时金价：${(+res?.resultData?.datas?.price || 0).toFixed(2)}`)
  }

  appTray.on('click', () => { appWindow.isVisible() || appWindow.show() })
  appTray.on('right-click', popUpContextMenu)
  appTray.on('mouse-enter', updateToolTip)
}

app.whenReady().then(() => {
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
