const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');

let mainWindow = null;
let dbApi = null;
let syncApi = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    let retries = 0;
    const tryLoad = () => {
      mainWindow.loadURL(devServerUrl).catch(() => {
        retries += 1;
        if (retries < 20) setTimeout(tryLoad, 500);
      });
    };
    tryLoad();
  } else {
    mainWindow.loadFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
  }
}

function broadcast(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function registerIpc() {
  ipcMain.handle('data:list', async (_evt, { entity, sortField, sortOrder }) => {
    return dbApi.listRecords(entity, sortField, sortOrder);
  });
  ipcMain.handle('data:get', async (_evt, { entity, id }) => {
    return dbApi.getRecord(entity, id);
  });
  ipcMain.handle('data:upsert', async (_evt, { entity, payload }) => {
    return dbApi.upsertRecord(entity, payload);
  });
  ipcMain.handle('data:delete', async (_evt, { entity, id }) => {
    dbApi.deleteRecord(entity, id);
    return { ok: true };
  });

  ipcMain.handle('sync:once', async () => syncApi.syncOnce());
  ipcMain.handle('sync:status', async () => ({
    ...syncApi.getSyncState(),
    pendingCount: dbApi.getPendingCount()
  }));
  ipcMain.handle('sync:pendingCount', async () => dbApi.getPendingCount());
  ipcMain.handle('sync:conflicts', async () => dbApi.listConflicts(200));

  ipcMain.handle('desktop:setOnline', async (_evt, { online }) => {
    syncApi.setOnlineStatus(online);
    return { ok: true };
  });
  ipcMain.handle('desktop:setAuthToken', async (_evt, { token }) => {
    syncApi.setAuthToken(token || null);
    return { ok: true };
  });
  ipcMain.handle('desktop:setSyncConfig', async (_evt, { config }) => {
    syncApi.setFirebaseConfig(config || {});
    return { ok: true };
  });

  ipcMain.handle('desktop:getOfflineMode', async () => dbApi.getMeta('offlineModeEnabled') !== '0');
  ipcMain.handle('desktop:setOfflineMode', async (_evt, { enabled }) => {
    dbApi.setMeta('offlineModeEnabled', enabled ? '1' : '0');
    broadcast('sync:state', {
      ...syncApi.getSyncState(),
      pendingCount: dbApi.getPendingCount()
    });
    return { ok: true };
  });
}

app.whenReady().then(async () => {
  dbApi = await import('./db/index.js');
  syncApi = await import('./sync/engine.js');

  dbApi.initDatabase(app.getPath('userData'));
  dbApi.setNotifier((payload) => {
    broadcast('data:changed', payload);
  });
  syncApi.configureSyncEvents({
    onStateChange: (state) => {
      broadcast('sync:state', { ...state, pendingCount: dbApi.getPendingCount() });
    },
    onConflictDetected: (conflict) => {
      broadcast('sync:conflict', conflict);
    }
  });

  syncApi.startSyncLoop(60000);
  registerIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
