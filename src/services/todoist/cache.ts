// A small IndexedDB cache so the dashboard opens instantly with the last synced data and can
// continue with an incremental sync instead of downloading the whole workspace again.
// Data stays in this browser only; it is keyed by a hash of the token, never the token itself.

const DB_NAME = 'md-dashboard';
const STORE = 'cache';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Never throws: a missing or broken cache just means a normal full sync. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return ((await run('readonly', (s) => s.get(key))) as T | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    await run('readwrite', (s) => s.put(value, key));
  } catch {
    // Quota or private mode: carry on without a cache.
  }
}

export async function cacheClear(): Promise<void> {
  try {
    await run('readwrite', (s) => s.clear());
  } catch {
    // Nothing to clear.
  }
}

export async function tokenFingerprint(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(`md-dashboard:${token.trim()}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
