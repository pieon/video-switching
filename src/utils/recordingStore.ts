// Crash-safe buffer for MediaRecorder chunks.
//
// MediaRecorder chunks only become a file when stopRecording() assembles them,
// so a closed tab loses everything held in memory. Every chunk is mirrored into
// IndexedDB as it arrives; if the page dies, the next load finds the leftovers
// and downloads them. IndexedDB stores Blobs natively, so no encoding is needed.

const DB_NAME = 'video_switching_recordings';
const STORE = 'chunks';

export interface PendingChunk {
  kind: 'screen' | 'webcam';
  participant: string;
  stamp: string;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Mirror one recorder chunk to disk. Failures are logged, never thrown. */
export async function appendChunk(chunk: PendingChunk): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(chunk);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.error('[recordingStore] failed to persist chunk', err);
  }
}

/** Every chunk left over from a previous run, in write order. */
export async function getPendingChunks(): Promise<PendingChunk[]> {
  try {
    const db = await openDb();
    const all = await new Promise<PendingChunk[]>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as PendingChunk[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return all;
  } catch (err) {
    console.error('[recordingStore] failed to read pending chunks', err);
    return [];
  }
}

/** Drop everything — called once a recording has been written to disk. */
export async function clearChunks(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.error('[recordingStore] failed to clear chunks', err);
  }
}
