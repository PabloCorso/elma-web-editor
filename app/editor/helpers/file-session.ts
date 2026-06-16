import {
  getFileHandle,
  getNewFileHandle,
  verifyPermission,
  writeFile,
} from "./file-system-access";
import { downloadLevel, levelToBlob } from "~/editor/helpers/download-level";
import type { EditorStore } from "~/editor/editor-store";
import { elmaLevelFromEditorState } from "~/editor/helpers/level-parser";
import type { ElmaLevel } from "~/editor/elma-types";

const DB_NAME = "elma-file-session";
const STORE_NAME = "handles";
const LAST_FILE_KEY = "last-file";
const LAST_FILE_NAME_KEY = "last-file-name";

type FileSessionStorage = {
  loadFileHandle(key: string): Promise<FileSystemFileHandle | null>;
  persistFileHandle(key: string, handle: FileSystemFileHandle): Promise<void>;
  loadFileName(key: string): Promise<string | null>;
  persistFileName(key: string, fileName: string): Promise<void>;
};

export type FileSessionOpenResult = {
  contents: ArrayBuffer;
  fileName: string;
};

export type FileSessionSaveResult = {
  mode: "file" | "download";
  fileName?: string;
};

export class FileSession {
  private store: EditorStore;
  private handle?: FileSystemFileHandle;
  private name?: string;
  private storage: FileSessionStorage;

  constructor(
    store: EditorStore,
    storage: FileSessionStorage = indexedDbStorage,
  ) {
    this.store = store;
    this.storage = storage;
  }

  get fileName() {
    return this.name;
  }

  get hasFile() {
    return Boolean(this.handle);
  }

  clear() {
    this.handle = undefined;
    this.name = undefined;
  }

  async openLast(): Promise<FileSessionOpenResult | false> {
    if (!canStoreFileSession()) return false;

    const fileHandle = await this.storage.loadFileHandle(LAST_FILE_KEY);
    if (!fileHandle) return this.openLastFromLevelFolder();

    const hasPermission = await hasReadPermission(fileHandle);
    if (!hasPermission) return this.openLastFromLevelFolder();

    return this.open(fileHandle);
  }

  private async openLastFromLevelFolder(): Promise<
    FileSessionOpenResult | false
  > {
    const fileName = await this.storage.loadFileName(LAST_FILE_NAME_KEY);
    if (!fileName) return false;

    const levelFolder = this.store.getState().levelFolder;
    const hasFolderAccess = await levelFolder.hasAccess();
    if (!hasFolderAccess) return false;

    const fileHandle = await levelFolder.getLevelFileHandle(fileName);
    const file = await fileHandle.getFile();
    const contents = await file.arrayBuffer();

    this.handle = fileHandle;
    this.name = file.name;
    await this.storage.persistFileHandle(LAST_FILE_KEY, fileHandle);
    await this.storage.persistFileName(LAST_FILE_NAME_KEY, file.name);

    return { contents, fileName };
  }

  /**
   * Open a file via picker (or provided handle) and keep the handle for later saves.
   */
  async open(
    handle?: FileSystemFileHandle,
  ): Promise<FileSessionOpenResult | false> {
    if (!isClient()) return false;
    if (!handle && !supportsFilePickers()) return false;

    const fileHandle = handle ?? (await getFileHandle());
    if (!fileHandle) return false;

    const hasPermission = await verifyPermission(fileHandle);
    if (!hasPermission) return false;

    const file = await fileHandle.getFile();
    const contents = await file.arrayBuffer();

    this.handle = fileHandle;
    this.name = file.name;
    await this.storage.persistFileHandle(LAST_FILE_KEY, fileHandle);
    await this.storage.persistFileName(LAST_FILE_NAME_KEY, file.name);

    return { contents, fileName: file.name };
  }

  async save() {
    if (!isClient()) return false;

    const level = elmaLevelFromEditorState(this.store.getState());
    if (!this.handle) {
      this.clear();
      downloadLevel(level);
      return { mode: "download", fileName: `${level.name}.lev` };
    }

    const canWrite = await verifyPermission(this.handle, { withWrite: true });
    if (!canWrite) {
      this.clear();
      downloadLevel(level);
      return { mode: "download", fileName: `${level.name}.lev` };
    }

    await writeFile(this.handle, levelToBlob(level));
    await this.storage.persistFileHandle(LAST_FILE_KEY, this.handle);
    if (this.name)
      await this.storage.persistFileName(LAST_FILE_NAME_KEY, this.name);
    return { mode: "file", fileName: this.name };
  }

  async saveAs(level: ElmaLevel) {
    if (!isClient()) return false;

    // No picker support: download instead.
    if (!supportsFilePickers()) {
      this.clear();
      downloadLevel(level);
      return { mode: "download", fileName: `${level.name}.lev` };
    }

    const fileHandle = await getNewFileHandle();
    if (!fileHandle) return false;

    const canWrite = await verifyPermission(fileHandle, { withWrite: true });
    if (!canWrite) {
      this.clear();
      downloadLevel(level);
      return { mode: "download", fileName: `${level.name}.lev` };
    }

    const blob = levelToBlob(level);
    await writeFile(fileHandle, blob);
    this.handle = fileHandle;
    this.name = fileHandle.name;
    await this.storage.persistFileHandle(LAST_FILE_KEY, fileHandle);
    await this.storage.persistFileName(LAST_FILE_NAME_KEY, fileHandle.name);
    return { mode: "file", fileName: fileHandle.name };
  }
}

function isClient() {
  return typeof window !== "undefined";
}

function canStoreFileSession() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export function supportsFilePickers() {
  return (
    typeof window !== "undefined" &&
    "showOpenFilePicker" in window &&
    "showSaveFilePicker" in window
  );
}

async function hasReadPermission(fileHandle: FileSystemFileHandle) {
  return (await fileHandle.queryPermission({ mode: "read" })) === "granted";
}

const indexedDbStorage: FileSessionStorage = {
  loadFileHandle,
  persistFileHandle,
  loadFileName,
  persistFileName,
};

async function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("indexedDB is not available in this environment");
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function persistFileHandle(
  key: string,
  handle: FileSystemFileHandle,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE_NAME).put(handle, key);
  });
}

async function loadFileHandle(
  key: string,
): Promise<FileSystemFileHandle | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function persistFileName(key: string, fileName: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE_NAME).put(fileName, key);
  });
}

async function loadFileName(key: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () =>
      resolve(typeof request.result === "string" ? request.result : null);
    request.onerror = () => reject(request.error);
  });
}
