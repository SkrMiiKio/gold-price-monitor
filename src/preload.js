const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('apiBridge', {
  isWindowVisible: () => ipcRenderer.invoke('is-window-visible'),
  onWindowVisibleChange: (callback) => ipcRenderer.on('window-visible-change', callback)
})
