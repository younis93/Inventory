import { firebaseService } from '../services/firebaseService';

function isDesktop() {
  return typeof window !== 'undefined' && Boolean(window.desktopAPI?.isDesktop);
}

async function desktopList(collectionName, sortField = 'updatedAt', sortOrder = 'desc') {
  return window.desktopAPI.list(collectionName, sortField, sortOrder);
}

export const dataClient = {
  isDesktop,

  subscribeToCollection: (collectionName, callback, sortField = 'name', sortOrder = 'asc', onError) => {
    if (!isDesktop()) {
      return firebaseService.subscribeToCollection(collectionName, callback, sortField, sortOrder, onError);
    }
    let active = true;
    const refresh = async () => {
      try {
        const data = await desktopList(collectionName, sortField, sortOrder);
        if (active) callback(data);
      } catch (error) {
        if (onError) onError(error);
      }
    };
    refresh();
    const unsub = window.desktopAPI.onDataChanged((payload) => {
      if (!payload?.entity || payload.entity === collectionName || payload.entity === '*') {
        refresh();
      }
    });
    return () => {
      active = false;
      unsub?.();
    };
  },

  add: async (collectionName, data) => {
    if (!isDesktop()) return firebaseService.add(collectionName, data);
    const id = crypto.randomUUID();
    return window.desktopAPI.upsert(collectionName, { ...data, _id: id });
  },

  update: async (collectionName, id, data) => {
    if (!isDesktop()) return firebaseService.update(collectionName, id, data);
    return window.desktopAPI.upsert(collectionName, { ...data, _id: id });
  },

  set: async (collectionName, id, data) => {
    if (!isDesktop()) return firebaseService.set(collectionName, id, data);
    return window.desktopAPI.upsert(collectionName, { ...data, _id: id });
  },

  delete: async (collectionName, id) => {
    if (!isDesktop()) return firebaseService.delete(collectionName, id);
    return window.desktopAPI.remove(collectionName, id);
  },

  listProducts: () => desktopList('products', 'name', 'asc'),
  getProduct: (id) => window.desktopAPI.get('products', id),
  upsertProduct: (product) => window.desktopAPI.upsert('products', product),
  deleteProduct: (id) => window.desktopAPI.remove('products', id),

  listOrders: () => desktopList('orders', 'date', 'desc'),
  getOrder: (id) => window.desktopAPI.get('orders', id),
  upsertOrder: (order) => window.desktopAPI.upsert('orders', order),
  deleteOrder: (id) => window.desktopAPI.remove('orders', id),

  listCustomers: () => desktopList('customers', 'name', 'asc'),
  getCustomer: (id) => window.desktopAPI.get('customers', id),
  upsertCustomer: (customer) => window.desktopAPI.upsert('customers', customer),
  deleteCustomer: (id) => window.desktopAPI.remove('customers', id),

  syncOnce: async () => {
    if (!isDesktop()) return { skipped: true };
    return window.desktopAPI.syncOnce();
  },
  getSyncStatus: async () => {
    if (!isDesktop()) return { online: navigator.onLine, pendingCount: 0, offlineModeEnabled: false };
    return window.desktopAPI.getSyncStatus();
  },
  getPendingSyncCount: async () => {
    if (!isDesktop()) return 0;
    return window.desktopAPI.getPendingCount();
  },
  getConflicts: async () => {
    if (!isDesktop()) return [];
    return window.desktopAPI.getConflicts();
  },
  setOnlineStatus: async (online) => {
    if (!isDesktop()) return;
    await window.desktopAPI.setOnline(online);
  },
  setAuthToken: async (token) => {
    if (!isDesktop()) return;
    await window.desktopAPI.setAuthToken(token || null);
  },
  setSyncConfig: async (config) => {
    if (!isDesktop()) return;
    await window.desktopAPI.setSyncConfig(config || {});
  },
  getOfflineModeEnabled: async () => {
    if (!isDesktop()) return false;
    return window.desktopAPI.getOfflineMode();
  },
  setOfflineModeEnabled: async (enabled) => {
    if (!isDesktop()) return;
    await window.desktopAPI.setOfflineMode(enabled);
  },
  onSyncState: (callback) => {
    if (!isDesktop()) return () => {};
    return window.desktopAPI.onSyncState(callback);
  },
  onConflict: (callback) => {
    if (!isDesktop()) return () => {};
    return window.desktopAPI.onConflict(callback);
  }
};
