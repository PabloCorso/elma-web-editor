import { afterEach, describe, expect, it, vi } from "vitest";
import { FileSession } from "./file-session";
import type { EditorStore } from "~/editor/editor-store";

describe("FileSession.openLast", () => {
  const originalWindow = globalThis.window;
  const originalIndexedDb = globalThis.indexedDB;

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = originalWindow;
    }

    if (originalIndexedDb === undefined) {
      Reflect.deleteProperty(globalThis, "indexedDB");
    } else {
      globalThis.indexedDB = originalIndexedDb;
    }
  });

  it("restores the last file from the level folder without requiring picker support", async () => {
    globalThis.window = {} as Window & typeof globalThis;
    globalThis.indexedDB = {} as IDBFactory;

    const contents = new Uint8Array([1, 2, 3]).buffer;
    const file = {
      name: "last.lev",
      arrayBuffer: vi.fn(async () => contents),
    };
    const fileHandle = {
      getFile: vi.fn(async () => file),
    } as unknown as FileSystemFileHandle;
    const levelFolder = {
      hasAccess: vi.fn(async () => true),
      ensureAccess: vi.fn(async () => {
        throw new DOMException("User activation is required", "SecurityError");
      }),
      getLevelFileHandle: vi.fn(async () => fileHandle),
    };
    const storage = {
      loadFileHandle: vi.fn(async () => null),
      loadFileName: vi.fn(async () => "last.lev"),
      persistFileHandle: vi.fn(async () => undefined),
      persistFileName: vi.fn(async () => undefined),
    };
    const store = {
      getState: () => ({ levelFolder }),
    } as unknown as EditorStore;

    const session = new FileSession(store, storage);
    const result = await session.openLast();

    expect(result).toEqual({ contents, fileName: "last.lev" });
    expect(levelFolder.hasAccess).toHaveBeenCalledWith();
    expect(levelFolder.ensureAccess).not.toHaveBeenCalled();
    expect(levelFolder.getLevelFileHandle).toHaveBeenCalledWith("last.lev");
    expect(storage.persistFileHandle).toHaveBeenCalledWith(
      "last-file",
      fileHandle,
    );
    expect(storage.persistFileName).toHaveBeenCalledWith(
      "last-file-name",
      "last.lev",
    );
  });

  it("restores a stored file handle without requiring picker support", async () => {
    globalThis.window = {} as Window & typeof globalThis;
    globalThis.indexedDB = {} as IDBFactory;

    const contents = new Uint8Array([4, 5, 6]).buffer;
    const file = {
      name: "stored.lev",
      arrayBuffer: vi.fn(async () => contents),
    };
    const fileHandle = {
      queryPermission: vi.fn(async () => "granted"),
      requestPermission: vi.fn(async () => "granted"),
      getFile: vi.fn(async () => file),
    } as unknown as FileSystemFileHandle;
    const levelFolder = {
      hasAccess: vi.fn(async () => false),
      ensureAccess: vi.fn(async () => false),
      getLevelFileHandle: vi.fn(),
    };
    const storage = {
      loadFileHandle: vi.fn(async () => fileHandle),
      loadFileName: vi.fn(async () => null),
      persistFileHandle: vi.fn(async () => undefined),
      persistFileName: vi.fn(async () => undefined),
    };
    const store = {
      getState: () => ({ levelFolder }),
    } as unknown as EditorStore;

    const session = new FileSession(store, storage);
    const result = await session.openLast();

    expect(result).toEqual({ contents, fileName: "stored.lev" });
    expect(fileHandle.queryPermission).toHaveBeenCalledWith({ mode: "read" });
    expect(levelFolder.ensureAccess).not.toHaveBeenCalled();
    expect(storage.persistFileHandle).toHaveBeenCalledWith(
      "last-file",
      fileHandle,
    );
    expect(storage.persistFileName).toHaveBeenCalledWith(
      "last-file-name",
      "stored.lev",
    );
  });
});
