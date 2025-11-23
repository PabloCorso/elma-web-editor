const DB_NAME = "elma-level-folder";
const STORE_NAME = "handles";

/**
 * Acquire and store:
 * const dir = await window.showDirectoryPicker();
 * const levels = new LevelFolder(dir);
 * await levels.ensureAccess(true);
 */
export class LevelFolder {
  constructor(private dir: FileSystemDirectoryHandle) {}

  static defaultKey = "lev-folder";

  static async fromPicker(key = LevelFolder.defaultKey) {
    const dir = await window.showDirectoryPicker();
    await persistHandle(key, dir);
    return new LevelFolder(dir);
  }

  static async fromStorage(key = LevelFolder.defaultKey) {
    const dir = await loadHandle(key);
    return dir ? new LevelFolder(dir) : null;
  }

  async persist(key = LevelFolder.defaultKey) {
    await persistHandle(key, this.dir);
  }

  async ensureAccess(write = false) {
    const opts = write ? { mode: "readwrite" } : { mode: "read" };
    if ((await this.dir.queryPermission(opts)) === "granted") return true;
    return (await this.dir.requestPermission(opts)) === "granted";
  }

  async listLevels() {
    const names: string[] = [];
    for await (const [name, entry] of this.dir.entries()) {
      if (entry.kind === "file" && name.endsWith(".lev")) names.push(name);
    }
    return names;
  }

  async readLevel(name: string) {
    const handle = await this.dir.getFileHandle(name);
    const file = await handle.getFile();
    return file.arrayBuffer(); // or text()
  }

  async writeLevel(name: string, data: BlobPart) {
    const handle = await this.dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  }
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function persistHandle(
  key: string,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE_NAME).put(handle, key);
  });
}

async function loadHandle(
  key: string
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
