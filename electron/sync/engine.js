import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where
} from 'firebase/firestore/lite';
import { firestore } from '../firebase.js';
import {
  applyRemoteRecord,
  getDeviceId,
  getDirtyRow,
  getEntitiesForSync,
  getMeta,
  getPendingQueueRows,
  listConflicts,
  logConflict,
  markQueueDone,
  markQueueFailed,
  markQueueInFlight,
  setMeta
} from '../db/index.js';

let online = true;
let syncInProgress = false;
let syncTimer = null;
let onSyncStateChange = () => {};
let onConflict = () => {};

function now() {
  return Date.now();
}

function isOfflineModeEnabled() {
  return getMeta('offlineModeEnabled') !== '0';
}

function emitState(extra = {}) {
  onSyncStateChange({
    online,
    syncInProgress,
    offlineModeEnabled: isOfflineModeEnabled(),
    ...extra
  });
}

function normalizeRemote(docSnap) {
  if (!docSnap.exists()) return null;
  return { _id: docSnap.id, ...docSnap.data() };
}

export function configureSyncEvents({ onStateChange, onConflictDetected }) {
  onSyncStateChange = onStateChange || (() => {});
  onConflict = onConflictDetected || (() => {});
}

export function setOnlineStatus(value) {
  online = Boolean(value);
  emitState();
}

export function getSyncState() {
  return {
    online,
    syncInProgress,
    offlineModeEnabled: isOfflineModeEnabled()
  };
}

export function startSyncLoop(intervalMs = 15000) {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    syncOnce().catch(() => {});
  }, intervalMs);
}

export function stopSyncLoop() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = null;
}

export async function syncOnce() {
  if (!online || !isOfflineModeEnabled() || syncInProgress) {
    emitState();
    return { skipped: true };
  }
  syncInProgress = true;
  emitState();
  try {
    await pushLocalChanges();
    await pullRemoteChanges();
    return { ok: true };
  } finally {
    syncInProgress = false;
    emitState();
  }
}

export async function pushLocalChanges() {
  const queueRows = getPendingQueueRows();
  const deviceId = getDeviceId();

  for (const row of queueRows) {
    markQueueInFlight(row.opId);
    try {
      const ref = doc(firestore, row.entity, row.docId);
      const remoteSnap = await getDoc(ref);
      const remote = normalizeRemote(remoteSnap);
      const remoteUpdatedAt = Number(remote?.updatedAt || 0);
      const baseUpdatedAt = Number(row.baseUpdatedAt || 0);
      const localRow = getDirtyRow(row.entity, row.docId);
      const localPayload = row.payload ? JSON.parse(row.payload) : (localRow?.data ? JSON.parse(localRow.data) : null);

      if (row.op === 'UPSERT') {
        const localUpdatedAt = Number(localPayload?.updatedAt || localRow?.updatedAt || 0);
        const conflictDetected = remoteUpdatedAt > baseUpdatedAt && localUpdatedAt > baseUpdatedAt;
        const resolved = resolveConflictLWW(localPayload, remote);

        await setDoc(ref, { ...resolved, updatedByDeviceId: resolved.updatedByDeviceId || deviceId }, { merge: true });
        applyRemoteRecord(row.entity, { ...resolved, _id: row.docId, deleted: Boolean(resolved.deleted) });

        if (conflictDetected) {
          logConflict({
            entity: row.entity,
            docId: row.docId,
            localPayload,
            remotePayload: remote,
            resolvedPayload: resolved,
            note: 'Both local and remote changed since baseUpdatedAt'
          });
          onConflict({
            entity: row.entity,
            docId: row.docId
          });
        }
      } else if (row.op === 'DELETE') {
        const deletePayload = {
          ...(remote || {}),
          deleted: true,
          updatedAt: now(),
          updatedByDeviceId: deviceId
        };
        await setDoc(ref, deletePayload, { merge: true });
        applyRemoteRecord(row.entity, { ...deletePayload, _id: row.docId });
      }

      markQueueDone(row.opId);
    } catch (error) {
      markQueueFailed(row.opId, error?.message || String(error));
    }
  }
}

export async function pullRemoteChanges() {
  const entities = getEntitiesForSync();
  const lastSyncAt = Number(getMeta('lastSyncAt') || 0);
  let maxSeenUpdatedAt = lastSyncAt;

  for (const entity of entities) {
    let snapshots = [];
    try {
      const q = query(collection(firestore, entity), where('updatedAt', '>', lastSyncAt), orderBy('updatedAt', 'asc'));
      snapshots = (await getDocs(q)).docs;
    } catch {
      const fallback = await getDocs(collection(firestore, entity));
      snapshots = fallback.docs.filter((snap) => Number((snap.data() || {}).updatedAt || 0) > lastSyncAt);
    }

    for (const snap of snapshots) {
      const remote = { _id: snap.id, ...snap.data() };
      const remoteUpdatedAt = Number(remote.updatedAt || 0);
      const localRow = getDirtyRow(entity, snap.id);

      if (remoteUpdatedAt > maxSeenUpdatedAt) {
        maxSeenUpdatedAt = remoteUpdatedAt;
      }

      if (!localRow) {
        applyRemoteRecord(entity, remote);
        continue;
      }

      const localUpdatedAt = Number(localRow.updatedAt || 0);
      const localDirty = Number(localRow.dirty || 0) === 1;
      if (localDirty && localUpdatedAt > remoteUpdatedAt) {
        continue;
      }
      applyRemoteRecord(entity, remote);
    }
  }

  if (maxSeenUpdatedAt > lastSyncAt) {
    setMeta('lastSyncAt', String(maxSeenUpdatedAt));
  }
}

export function resolveConflictLWW(localPayload, remotePayload) {
  const localUpdatedAt = Number(localPayload?.updatedAt || 0);
  const remoteUpdatedAt = Number(remotePayload?.updatedAt || 0);
  if (localUpdatedAt >= remoteUpdatedAt) {
    return localPayload || {};
  }
  return remotePayload || {};
}

export function getConflictLog(limit = 100) {
  return listConflicts(limit);
}
