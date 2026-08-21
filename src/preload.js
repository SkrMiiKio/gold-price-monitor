const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('apiBridge', {
  isVisible: (e) => ipcRenderer.invoke('is-visible', e),
  isPointHover: (e) => ipcRenderer.invoke('is-point-hover', e),
  getPriceData: (e) => ipcRenderer.invoke('get-price-data', e),
  getPriceInfo: (e) => ipcRenderer.invoke('get-price-info', e),
  setPenetrate: (e) => ipcRenderer.send('set-penetrate', e),
  setDragState: (e) => ipcRenderer.send('set-drag-state', e),
  setContentSize: (e) => ipcRenderer.send('set-content-size', e),
  webInitHandle: (e) => ipcRenderer.send('web-init-handle', e),
  onVisibleChange: (callback) => ipcRenderer.on('visible-change', callback),
  onSettingChange: (callback) => ipcRenderer.on('setting-change', callback),
  onFixedChange: (callback) => ipcRenderer.on('fixed-change', callback)
})
