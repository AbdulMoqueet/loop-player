/**
 * Persistence for the last picked track. The audio file itself goes into
 * IndexedDB (localStorage can't hold blobs); the small session settings
 * (loop points, speed, volume) go into localStorage as JSON.
 */

const DB_NAME = 'loop-player';
const STORE = 'tracks';
const FILE_KEY = 'last';
const SETTINGS_KEY = 'loop-player:last-session';

export interface SavedSession {
  name: string;
  pointA: number;
  pointB: number;
  speed: number;
  volume: number;
  muted: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLastFile(file: File): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(file, FILE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadLastFile(): Promise<File | null> {
  const db = await openDb();
  const result = await new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(FILE_KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (result instanceof File) return result;
  // Some browsers hand Files back as plain Blobs — rewrap with the saved name.
  if (result instanceof Blob) {
    const name = loadSession()?.name ?? 'audio';
    return new File([result], name, { type: result.type });
  }
  return null;
}

export async function clearLastFile(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(FILE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function saveSession(session: SavedSession): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(session));
  } catch {
    /* storage full or blocked — persistence is best-effort */
  }
}

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<SavedSession>;
    if (typeof s.name !== 'string') return null;
    return {
      name: s.name,
      pointA: typeof s.pointA === 'number' ? s.pointA : 0,
      pointB: typeof s.pointB === 'number' ? s.pointB : 0,
      speed: typeof s.speed === 'number' ? s.speed : 1,
      volume: typeof s.volume === 'number' ? s.volume : 1,
      muted: s.muted === true,
    };
  } catch {
    return null;
  }
}
