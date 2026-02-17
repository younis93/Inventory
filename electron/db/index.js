import path from 'path';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';

const ENTITY_TABLES = ['products', 'orders', 'customers', 'categories', 'users', 'settings'];
const SYNCED_TABLES = ['products', 'orders', 'customers', 'categories', 'users', 'settings'];

let db;
let notify = () => {};

function now() {
  return Date.now();
}

function rowToDoc(row) {
  if (!row) return null;
  const parsed = row.data ? JSON.parse(row.data) : {};
  return { _id: row.id, ...parsed };
}

function sortDocs(docs, sortField = 'updatedAt', sortOrder = 'desc') {
  const dir = sortOrder === 'asc' ? 1 : -1;
  return [...docs].sort((a, b) => {
    const av = a?.[sortField];
    const bv = b?.[sortField];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av > bv ? dir : -dir;
  });
}

function ensureEntity(entity) {
  if (!ENTITY_TABLES.includes(entity)) {
    throw new Error(`Unsupported entity: ${entity}`);
  }
}

export function initDatabase(userDataPath) {
  const dbPath = path.join(userDataPath, 'inventory.sqlite');
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();

  for (const table of ENTITY_TABLES) {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        data TEXT,
        updatedAt INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0,
        dirty INTEGER NOT NULL DEFAULT 0,
        localVersion INTEGER NOT NULL DEFAULT 0
      )
    `).run();
  }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      opId TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      docId TEXT NOT NULL,
      op TEXT NOT NULL,
      payload TEXT,
      baseUpdatedAt INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      error TEXT,
      attemptCount INTEGER NOT NULL DEFAULT 0
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS conflict_log (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      docId TEXT NOT NULL,
      localPayload TEXT,
      remotePayload TEXT,
      resolvedPayload TEXT,
      resolvedAt INTEGER NOT NULL,
      strategy TEXT NOT NULL,
      note TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS storage_queue (
      id TEXT PRIMARY KEY,
      localFilePath TEXT NOT NULL,
      remotePath TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      status TEXT NOT NULL
    )
  `).run();

  if (!getMeta('deviceId')) {
    setMeta('deviceId', crypto.randomUUID());
  }
  if (!getMeta('schemaVersion')) {
    setMeta('schemaVersion', '1');
  }
  if (!getMeta('offlineModeEnabled')) {
    setMeta('offlineModeEnabled', '1');
  }
  return dbPath;
}

export function setNotifier(fn) {
  notify = typeof fn === 'function' ? fn : () => {};
}

export function getMeta(key) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row?.value ?? null;
}

export function setMeta(key, value) {
  db.prepare(`
    INSERT INTO meta (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(key, String(value));
}

export function listRecords(entity, sortField = 'updatedAt', sortOrder = 'desc') {
  ensureEntity(entity);
  const rows = db.prepare(`SELECT * FROM ${entity} WHERE deleted = 0`).all();
  const docs = rows.map(rowToDoc);
  return sortDocs(docs, sortField, sortOrder);
}

export function getRecord(entity, id) {
  ensureEntity(entity);
  const row = db.prepare(`SELECT * FROM ${entity} WHERE id = ?`).get(id);
  return rowToDoc(row);
}

export function upsertRecord(entity, payload, options = {}) {
  ensureEntity(entity);
  const existing = payload?._id ? getTableRow(entity, payload._id) : null;
  const id = payload?._id || crypto.randomUUID();
  const baseUpdatedAt = Number(options.baseUpdatedAt ?? existing?.updatedAt ?? 0);
  const localVersion = Number(existing?.localVersion ?? 0) + 1;
  const updatedAt = Number(payload?.updatedAt ?? now());
  const nextPayload = { ...payload, _id: id, updatedAt };
  const deleted = Number(Boolean(nextPayload.deleted));
  const dirty = options.fromSync ? 0 : 1;

  db.prepare(`
    INSERT INTO ${entity} (id, data, updatedAt, deleted, dirty, localVersion)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      data=excluded.data,
      updatedAt=excluded.updatedAt,
      deleted=excluded.deleted,
      dirty=excluded.dirty,
      localVersion=excluded.localVersion
  `).run(id, JSON.stringify(nextPayload), updatedAt, deleted, dirty, localVersion);

  if (!options.fromSync && SYNCED_TABLES.includes(entity)) {
    enqueueOperation({
      entity,
      docId: id,
      op: 'UPSERT',
      payload: nextPayload,
      baseUpdatedAt
    });
  }

  notify({ entity });
  return nextPayload;
}

export function deleteRecord(entity, id, options = {}) {
  ensureEntity(entity);
  const existing = getTableRow(entity, id);
  if (!existing) return;

  const baseUpdatedAt = Number(options.baseUpdatedAt ?? existing.updatedAt ?? 0);
  const updatedAt = now();
  const parsed = existing.data ? JSON.parse(existing.data) : {};
  const tombstone = {
    ...parsed,
    _id: id,
    deleted: true,
    updatedAt
  };

  db.prepare(`
    UPDATE ${entity}
    SET data = ?, updatedAt = ?, deleted = 1, dirty = ?, localVersion = localVersion + 1
    WHERE id = ?
  `).run(JSON.stringify(tombstone), updatedAt, options.fromSync ? 0 : 1, id);

  if (!options.fromSync && SYNCED_TABLES.includes(entity)) {
    enqueueOperation({
      entity,
      docId: id,
      op: 'DELETE',
      payload: tombstone,
      baseUpdatedAt
    });
  }

  notify({ entity });
}

export function applyRemoteRecord(entity, payload) {
  const normalized = { ...payload, _id: payload._id || payload.id };
  return upsertRecord(entity, normalized, { fromSync: true });
}

function enqueueOperation({ entity, docId, op, payload, baseUpdatedAt }) {
  db.prepare(`
    INSERT INTO sync_queue (opId, entity, docId, op, payload, baseUpdatedAt, createdAt, status, attemptCount)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)
  `).run(
    crypto.randomUUID(),
    entity,
    docId,
    op,
    JSON.stringify(payload ?? null),
    Number(baseUpdatedAt || 0),
    now()
  );
}

export function getPendingQueueRows() {
  return db.prepare(`
    SELECT * FROM sync_queue
    WHERE status IN ('PENDING', 'FAILED')
    ORDER BY createdAt ASC
  `).all();
}

export function markQueueInFlight(opId) {
  db.prepare(`
    UPDATE sync_queue
    SET status = 'INFLIGHT', attemptCount = attemptCount + 1, error = NULL
    WHERE opId = ?
  `).run(opId);
}

export function markQueueDone(opId) {
  db.prepare(`UPDATE sync_queue SET status = 'DONE', error = NULL WHERE opId = ?`).run(opId);
}

export function markQueueFailed(opId, error) {
  db.prepare(`UPDATE sync_queue SET status = 'FAILED', error = ? WHERE opId = ?`).run(String(error || 'Unknown error'), opId);
}

export function getPendingCount() {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM sync_queue
    WHERE status IN ('PENDING', 'FAILED')
  `).get();
  return Number(row?.count || 0);
}

export function getDeviceId() {
  return getMeta('deviceId');
}

export function logConflict(entry) {
  db.prepare(`
    INSERT INTO conflict_log (
      id, entity, docId, localPayload, remotePayload, resolvedPayload, resolvedAt, strategy, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    entry.entity,
    entry.docId,
    JSON.stringify(entry.localPayload ?? null),
    JSON.stringify(entry.remotePayload ?? null),
    JSON.stringify(entry.resolvedPayload ?? null),
    now(),
    'LWW',
    entry.note || ''
  );
  notify({ entity: 'conflict_log' });
}

export function listConflicts(limit = 100) {
  const rows = db.prepare(`
    SELECT * FROM conflict_log
    ORDER BY resolvedAt DESC
    LIMIT ?
  `).all(limit);
  return rows.map((row) => ({
    id: row.id,
    entity: row.entity,
    docId: row.docId,
    localPayload: row.localPayload ? JSON.parse(row.localPayload) : null,
    remotePayload: row.remotePayload ? JSON.parse(row.remotePayload) : null,
    resolvedPayload: row.resolvedPayload ? JSON.parse(row.resolvedPayload) : null,
    resolvedAt: row.resolvedAt,
    strategy: row.strategy,
    note: row.note
  }));
}

export function getDirtyRow(entity, id) {
  ensureEntity(entity);
  return db.prepare(`SELECT * FROM ${entity} WHERE id = ?`).get(id);
}

export function getEntitiesForSync() {
  return [...SYNCED_TABLES];
}

function getTableRow(entity, id) {
  ensureEntity(entity);
  return db.prepare(`SELECT * FROM ${entity} WHERE id = ?`).get(id);
}
