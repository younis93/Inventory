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
import { firebaseConfig } from '../firebase.js';

let online = true;
let syncInProgress = false;
let syncTimer = null;
let authToken = null;
let runtimeFirebaseConfig = { ...(firebaseConfig || {}) };
let onSyncStateChange = () => {};
let onConflict = () => {};
const databaseId = '(default)';
let quotaBackoffUntil = 0;
let quotaBackoffMs = 0;
const QUOTA_BACKOFF_START_MS = 15000;
const QUOTA_BACKOFF_MAX_MS = 5 * 60 * 1000;

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
  if (!docSnap) return null;
  return { _id: docSnap.id, ...docSnap.data };
}

export function configureSyncEvents({ onStateChange, onConflictDetected }) {
  onSyncStateChange = onStateChange || (() => {});
  onConflict = onConflictDetected || (() => {});
}

export function setAuthToken(token) {
  authToken = token || null;
}

export function setFirebaseConfig(config) {
  runtimeFirebaseConfig = {
    ...runtimeFirebaseConfig,
    ...(config || {})
  };
}

export function setOnlineStatus(value) {
  const wasOnline = online;
  online = Boolean(value);
  emitState();
  if (!wasOnline && online && isOfflineModeEnabled()) {
    syncOnce().catch(() => {});
  }
}

export function getSyncState() {
  return {
    online,
    syncInProgress,
    offlineModeEnabled: isOfflineModeEnabled(),
    quotaBackoffUntil
  };
}

export function startSyncLoop(intervalMs = 15000) {
  if (syncTimer) clearInterval(syncTimer);
  syncOnce().catch(() => {});
  syncTimer = setInterval(() => {
    syncOnce().catch(() => {});
  }, intervalMs);
}

export function stopSyncLoop() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = null;
}

export async function syncOnce() {
  const remainingBackoff = quotaBackoffUntil - now();
  if (!online || !isOfflineModeEnabled() || syncInProgress || !authToken || remainingBackoff > 0) {
    emitState();
    return {
      skipped: true,
      rateLimited: remainingBackoff > 0,
      retryAfterMs: Math.max(0, remainingBackoff)
    };
  }
  syncInProgress = true;
  emitState();
  try {
    const pushResult = await pushLocalChanges();
    await pullRemoteChanges();
    quotaBackoffUntil = 0;
    quotaBackoffMs = 0;
    return { ok: true, ...pushResult };
  } catch (error) {
    if (isRateLimited(error)) {
      quotaBackoffMs = quotaBackoffMs ? Math.min(quotaBackoffMs * 2, QUOTA_BACKOFF_MAX_MS) : QUOTA_BACKOFF_START_MS;
      quotaBackoffUntil = now() + quotaBackoffMs;
      emitState({ quotaBackoffUntil });
      return {
        skipped: true,
        rateLimited: true,
        retryAfterMs: quotaBackoffMs
      };
    }
    throw error;
  } finally {
    syncInProgress = false;
    emitState();
  }
}

export async function pushLocalChanges() {
  const queueRows = getPendingQueueRows();
  const deviceId = getDeviceId();
  let processed = 0;
  let failed = 0;
  const errors = [];

  for (const row of queueRows) {
    markQueueInFlight(row.opId);
    try {
      const remoteSnap = await getRemoteDoc(row.entity, row.docId);
      const remote = normalizeRemote(remoteSnap);
      const remoteUpdatedAt = Number(remote?.updatedAt || 0);
      const baseUpdatedAt = Number(row.baseUpdatedAt || 0);
      const localRow = getDirtyRow(row.entity, row.docId);
      const localPayload = row.payload ? JSON.parse(row.payload) : (localRow?.data ? JSON.parse(localRow.data) : null);

      if (row.op === 'UPSERT') {
        const localUpdatedAt = Number(localPayload?.updatedAt || localRow?.updatedAt || 0);
        const conflictDetected = remoteUpdatedAt > baseUpdatedAt && localUpdatedAt > baseUpdatedAt;
        const resolved = resolveConflictLWW(localPayload, remote);

        await setRemoteDoc(row.entity, row.docId, { ...resolved, updatedByDeviceId: resolved.updatedByDeviceId || deviceId });
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
        await setRemoteDoc(row.entity, row.docId, deletePayload);
        applyRemoteRecord(row.entity, { ...deletePayload, _id: row.docId });
      }

      markQueueDone(row.opId);
      processed += 1;
    } catch (error) {
      markQueueFailed(row.opId, error?.message || String(error));
      failed += 1;
      errors.push({
        entity: row.entity,
        docId: row.docId,
        op: row.op,
        error: error?.message || String(error)
      });
      if (isRateLimited(error)) {
        throw error;
      }
    }
  }
  return { processed, failed, errors };
}

export async function pullRemoteChanges() {
  const entities = getEntitiesForSync();
  const lastSyncAt = Number(getMeta('lastSyncAt') || 0);
  let maxSeenUpdatedAt = lastSyncAt;

  for (const entity of entities) {
    const snapshots = await queryRemoteDocsSince(entity, lastSyncAt);
    for (const snap of snapshots) {
      const remote = { _id: snap.id, ...snap.data };
      const remoteUpdatedAt = Number(remote.updatedAt || 0);
      if (remoteUpdatedAt <= lastSyncAt) continue;
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

async function apiRequest(url, options = {}) {
  const projectId = runtimeFirebaseConfig?.projectId || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Desktop sync missing Firebase project ID.');
  }
  if (!authToken) {
    throw new Error('Desktop sync requires authenticated user token.');
  }
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(`Firestore API ${response.status}: ${message || 'Request failed'}`);
    error.statusCode = response.status;
    throw error;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function docUrl(entity, docId) {
  const projectId = runtimeFirebaseConfig?.projectId || process.env.VITE_FIREBASE_PROJECT_ID;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${entity}/${encodeURIComponent(docId)}`;
}

function runQueryUrl() {
  const projectId = runtimeFirebaseConfig?.projectId || process.env.VITE_FIREBASE_PROJECT_ID;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`;
}

async function getRemoteDoc(entity, docId) {
  const url = docUrl(entity, docId);
  try {
    const doc = await apiRequest(url, { method: 'GET' });
    return parseFirestoreDocument(doc);
  } catch (error) {
    if (String(error?.message || '').includes(' 404:')) return null;
    throw error;
  }
}

async function setRemoteDoc(entity, docId, payload) {
  const url = docUrl(entity, docId);
  const body = JSON.stringify({ fields: toFirestoreFields(payload) });
  await apiRequest(url, { method: 'PATCH', body });
}

async function queryRemoteDocsSince(entity, minUpdatedAt) {
  const url = runQueryUrl();
  const body = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: entity }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'updatedAt' },
          op: 'GREATER_THAN',
          value: { integerValue: String(Math.max(0, Number(minUpdatedAt || 0))) }
        }
      },
      orderBy: [{ field: { fieldPath: 'updatedAt' }, direction: 'ASCENDING' }]
    }
  });

  const result = await apiRequest(url, { method: 'POST', body });
  const rows = Array.isArray(result) ? result : [];
  const docs = [];
  for (const row of rows) {
    const parsed = parseFirestoreDocument(row?.document);
    if (parsed) docs.push(parsed);
  }
  return docs;
}

function parseFirestoreDocument(doc) {
  if (!doc?.name) return null;
  const id = doc.name.split('/').pop();
  return {
    id,
    data: fromFirestoreFields(doc.fields || {})
  };
}

function toFirestoreFields(value) {
  const result = {};
  const entries = Object.entries(value || {});
  for (const [key, fieldValue] of entries) {
    if (fieldValue === undefined) continue;
    result[key] = toFirestoreValue(fieldValue);
  }
  return result;
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'object') {
    return { mapValue: { fields: toFirestoreFields(value) } };
  }
  return { stringValue: String(value) };
}

function fromFirestoreFields(fields) {
  const result = {};
  for (const [key, val] of Object.entries(fields || {})) {
    result[key] = fromFirestoreValue(val);
  }
  return result;
}

function fromFirestoreValue(value) {
  if (value.nullValue !== undefined) return null;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return Number(value.doubleValue);
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.arrayValue !== undefined) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if (value.mapValue !== undefined) return fromFirestoreFields(value.mapValue.fields || {});
  return null;
}

function isRateLimited(error) {
  return Number(error?.statusCode) === 429 || String(error?.message || '').includes('Firestore API 429');
}
