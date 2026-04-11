const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('apiBridge', {
  isVisible: () => ipcRenderer.invoke('is-visible'),
  isUseCssDrag: () => ipcRenderer.invoke('is-use-css-drag'),
  getPriceInfo: (data) => ipcRenderer.invoke('get-price-info', data),
  setPriceData: (data) => ipcRenderer.send('set-price-data', data),
  setDragState: (data) => ipcRenderer.send('set-drag-state', data),
  setContentSize: (data) => ipcRenderer.send('set-content-size', data),
  onGetPriceData: (callback) => ipcRenderer.on('get-price-data', callback),
  onVisibleChange: (callback) => ipcRenderer.on('visible-change', callback),
  onConfigChange: (callback) => ipcRenderer.on('config-change', callback)
})
