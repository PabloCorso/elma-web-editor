import {
  getFileHandle,
  getNewFileHandle,
  verifyPermission,
  writeFile,
} from "./file-system-access";
import { downloadLevel, levelToBlob } from "~/editor/utils/download-level";
import type { EditorStore } from "~/editor/editor-store";
import { elmaLevelFromEditorState } from "~/editor/utils/level-parser";
import type { ElmaLevel } from "~/editor/elma-types";

export class FileSession {
  private store: EditorStore;
  private handle?: FileSystemFileHandle;
  private name?: string;
  private modified = false;

  constructor(store: EditorStore) {
    this.store = store;
  }

  get fileName() {
    return this.name;
  }

  get hasFile() {
    return Boolean(this.handle);
  }

  get isModified() {
    return this.modified;
  }

  /**
   * Open a file via picker (or provided handle) and keep the handle for later saves.
   */
  async open(handle?: FileSystemFileHandle): Promise<ArrayBuffer | false> {
    if (!isClient()) return false;
    if (!supportsFilePickers()) return false;

    const fileHandle = handle ?? (await getFileHandle());
    if (!fileHandle) return false;

    const hasPermission = await verifyPermission(fileHandle);
    if (!hasPermission) return false;

    const file = await fileHandle.getFile();
    const contents = await file.arrayBuffer();

    this.handle = fileHandle;
    this.name = file.name;
    this.modified = false;

    return contents;
  }

  async save() {
    if (!isClient()) return false;

    const level = elmaLevelFromEditorState(this.store.getState());
    if (!supportsFilePickers()) {
      downloadLevel(level);
      return true;
    }

    if (!this.handle) return false;

    const canWrite = await verifyPermission(this.handle, { withWrite: true });
    if (!canWrite) {
      downloadLevel(level);
      return false;
    }

    await writeFile(this.handle, levelToBlob(level));
    // this.modified handling can be added when implemented.
    return true;
  }

  async saveAs(level: ElmaLevel) {
    if (!isClient()) return false;

    // No picker support: download instead.
    if (!supportsFilePickers()) {
      downloadLevel(level);
      return true;
    }

    const fileHandle = await getNewFileHandle();
    if (!fileHandle) return false;

    const canWrite = await verifyPermission(fileHandle, { withWrite: true });
    if (!canWrite) {
      downloadLevel(level);
      return false;
    }

    const blob = levelToBlob(level);
    await writeFile(fileHandle, blob);
    this.handle = fileHandle;
    this.name = fileHandle.name;
    return true;
  }
}

function isClient() {
  return typeof window !== "undefined";
}

export function supportsFilePickers() {
  return (
    typeof window !== "undefined" &&
    "showOpenFilePicker" in window &&
    "showSaveFilePicker" in window
  );
}
