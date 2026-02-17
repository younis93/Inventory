const { contextBridge, ipcRenderer } = require('electron');

const desktopAPI = {
  isDesktop: true,
  list: (entity, sortField = 'updatedAt', sortOrder = 'desc') =>
    ipcRenderer.invoke('data:list', { entity, sortField, sortOrder }),
  get: (entity, id) => ipcRenderer.invoke('data:get', { entity, id }),
  upsert: (entity, payload) => ipcRenderer.invoke('data:upsert', { entity, payload }),
  remove: (entity, id) => ipcRenderer.invoke('data:delete', { entity, id }),
  syncOnce: () => ipcRenderer.invoke('sync:once'),
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  getPendingCount: () => ipcRenderer.invoke('sync:pendingCount'),
  getConflicts: () => ipcRenderer.invoke('sync:conflicts'),
  setOnline: (online) => ipcRenderer.invoke('desktop:setOnline', { online }),
  getOfflineMode: () => ipcRenderer.invoke('desktop:getOfflineMode'),
  setOfflineMode: (enabled) => ipcRenderer.invoke('desktop:setOfflineMode', { enabled }),
  onDataChanged: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('data:changed', handler);
    return () => ipcRenderer.removeListener('data:changed', handler);
  },
  onSyncState: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('sync:state', handler);
    return () => ipcRenderer.removeListener('sync:state', handler);
  },
  onConflict: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('sync:conflict', handler);
    return () => ipcRenderer.removeListener('sync:conflict', handler);
  }
};

contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);
