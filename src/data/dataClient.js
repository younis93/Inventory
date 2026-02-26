import { firebaseService } from '../services/firebaseService';

function isDesktop() {
  return typeof window !== 'undefined' && Boolean(window.desktopAPI?.isDesktop);
}

async function desktopList(collectionName, sortField = 'updatedAt', sortOrder = 'desc') {
  return window.desktopAPI.list(collectionName, sortField, sortOrder);
}

function getByPath(source, path) {
  if (!source || !path) return undefined;
  return String(path).split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), source);
}

function compareValues(a, b, sortOrder = 'asc') {
  const aValue = a == null ? '' : a;
  const bValue = b == null ? '' : b;

  let result = 0;
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    result = aValue - bValue;
  } else {
    result = String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
  }

  return sortOrder === 'asc' ? result : -result;
}

function getStockStatus(stock) {
  const value = Number(stock || 0);
  if (value <= 0) return 'Out of Stock';
  if (value <= 10) return 'Low Stock';
  return 'In Stock';
}

function getOrderItemProductId(item) {
  return item?.product?._id || item?.productId || '';
}

function getOrderItemQty(item) {
  const value = Number(item?.qty ?? item?.quantity ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
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

  returnOrderWithStock: async (orderId, { reason = '', date = '', returnedBy = 'System' } = {}) => {
    if (!orderId) throw new Error('returnOrderWithStock: orderId is required');

    if (!isDesktop()) {
      return firebaseService.returnOrderWithStock(orderId, { reason, date, returnedBy });
    }

    const order = await window.desktopAPI.get('orders', orderId);
    if (!order) throw new Error('Order not found.');
    if (order.returnProcessed || order.status === 'Returned') {
      return { alreadyReturned: true };
    }

    const nowIso = new Date().toISOString();
    const normalizedDate = (() => {
      if (!date) return nowIso.slice(0, 10);
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) return nowIso.slice(0, 10);
      return parsed.toISOString().slice(0, 10);
    })();

    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const productId = getOrderItemProductId(item);
      const qty = getOrderItemQty(item);
      if (!productId || qty <= 0) continue;

      const product = await window.desktopAPI.get('products', productId);
      if (!product) continue;

      const nextStock = Math.max(0, Number(product.stock || 0) + qty);
      await window.desktopAPI.upsert('products', {
        ...product,
        stock: nextStock,
        status: getStockStatus(nextStock),
        updatedAt: nowIso
      });
    }

    await window.desktopAPI.upsert('orders', {
      ...order,
      status: 'Returned',
      returnProcessed: true,
      returnReason: String(reason || '').trim(),
      returnDate: normalizedDate,
      returnedAt: nowIso,
      returnedBy: returnedBy || 'System',
      updatedAt: nowIso
    });

    return { alreadyReturned: false };
  },

  listPage: async (
    collectionName,
    {
      sortField = 'updatedAt',
      sortOrder = 'desc',
      limitCount = 50,
      cursor = null
    } = {}
  ) => {
    if (!collectionName) throw new Error('listPage: collectionName is required');

    if (!isDesktop()) {
      return firebaseService.listPage(collectionName, {
        sortField,
        sortOrder,
        limitCount,
        cursor
      });
    }

    const rows = await desktopList(collectionName, sortField, sortOrder);
    const sorted = [...rows].sort((left, right) => {
      const primary = compareValues(getByPath(left, sortField), getByPath(right, sortField), sortOrder);
      if (primary !== 0) return primary;
      return compareValues(left?._id, right?._id, sortOrder);
    });

    const cursorIndex = Number.isInteger(cursor) ? cursor : Number(cursor || 0);
    const startIndex = Math.max(0, cursorIndex);
    const data = sorted.slice(startIndex, startIndex + limitCount);
    const nextCursor = startIndex + data.length;

    return {
      data,
      cursor: nextCursor,
      hasMore: nextCursor < sorted.length
    };
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
    if (!isDesktop()) return () => { };
    return window.desktopAPI.onSyncState(callback);
  },
  onConflict: (callback) => {
    if (!isDesktop()) return () => { };
    return window.desktopAPI.onConflict(callback);
  },
  getUserByEmail: async (email) => {
    if (!email) return null;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. If not desktop, just do the remote check
    if (!isDesktop()) return firebaseService.getUserByEmail(normalizedEmail);

    try {
      // 2. On Desktop: Try LOCAL first (Fastest and handles unsynced newly added users)
      const users = await desktopList('users');
      const localUser = users.find(u => u.email?.toLowerCase() === normalizedEmail) ||
        users.find(u => u._id?.toLowerCase() === normalizedEmail);

      if (localUser) return localUser;

      // 3. Fallback to remote if online and not found locally
      if (navigator.onLine) {
        return await firebaseService.getUserByEmail(normalizedEmail);
      }

      return null;
    } catch (error) {
      console.error("getUserByEmail Error:", error);
      // Last resort fallback to a fresh remote check if we somehow failed local
      if (navigator.onLine) {
        return firebaseService.getUserByEmail(normalizedEmail).catch(() => null);
      }
      return null;
    }
  },
  getUserByUsername: async (username) => {
    if (!username) return null;
    const normalizedUsername = username.toLowerCase().trim();

    if (!isDesktop()) return firebaseService.getUserByUsername(normalizedUsername);

    try {
      // 1. Local first for desktop/offline support.
      const users = await desktopList('users');
      const localUser = users.find((u) =>
        String(u.usernameLower || '').toLowerCase() === normalizedUsername
      ) || users.find((u) =>
        String(u.username || '').toLowerCase() === normalizedUsername
      );

      if (localUser) return localUser;

      // 2. Remote fallback if online
      if (navigator.onLine) {
        return await firebaseService.getUserByUsername(normalizedUsername);
      }

      return null;
    } catch (error) {
      console.error("getUserByUsername Error:", error);
      if (navigator.onLine) {
        return firebaseService.getUserByUsername(normalizedUsername).catch(() => null);
      }
      return null;
    }
  }
};
