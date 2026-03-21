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

  constructor(store: EditorStore) {
    this.store = store;
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

  /**
   * Open a file via picker (or provided handle) and keep the handle for later saves.
   */
  async open(
    handle?: FileSystemFileHandle,
  ): Promise<FileSessionOpenResult | false> {
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

    return { contents, fileName: file.name };
  }

  async save() {
    if (!isClient()) return false;

    const level = elmaLevelFromEditorState(this.store.getState());
    if (!supportsFilePickers()) {
      this.clear();
      downloadLevel(level);
      return { mode: "download", fileName: `${level.name}.lev` };
    }

    if (!this.handle) return false;

    const canWrite = await verifyPermission(this.handle, { withWrite: true });
    if (!canWrite) {
      this.clear();
      downloadLevel(level);
      return { mode: "download", fileName: `${level.name}.lev` };
    }

    await writeFile(this.handle, levelToBlob(level));
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
    return { mode: "file", fileName: fileHandle.name };
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
