import type { Level } from "elmajs";
import {
  getFileHandle,
  getNewFileHandle,
  readFile,
  verifyPermission,
  writeFile,
} from "./file-system-access";
import { levelToBlob } from "~/editor/utils/download-level";

export class FileSession {
  private contents: BlobPart | null = null;
  private handle?: FileSystemFileHandle;
  private name?: string;
  private modified = false;

  get fileName() {
    return this.name;
  }

  get hasFile() {
    return Boolean(this.handle);
  }

  get isModified() {
    return this.modified;
  }

  get content() {
    return this.contents;
  }

  setContent(content: BlobPart) {
    this.contents = content;
    this.modified = true;
  }

  /**
   * Open a file via picker (or provided handle) and keep the handle for later saves.
   */
  async open(handle?: FileSystemFileHandle) {
    if (!isClient() || !hasFilePickers()) return false;
    const fileHandle = handle ?? (await getFileHandle());
    if (!fileHandle) return false;
    if (!(await verifyPermission(fileHandle))) return false;
    const file = await fileHandle.getFile();
    // Prefer ArrayBuffer to keep binary (.lev) intact
    this.contents = await readFile(file);
    this.handle = fileHandle;
    this.name = file.name;
    this.modified = false;
    return this.content;
  }

  /**
   * Save to the current handle.
   */
  async save() {
    if (!isClient() || !hasFilePickers()) return false;
    if (!this.handle) return null;
    if (this.contents == null) return false;
    if (!(await verifyPermission(this.handle, { withWrite: true }))) {
      return false;
    }
    await writeFile(this.handle, this.contents);
    this.modified = false;
    return true;
  }

  /**
   * Prompt for a target and save there, capturing the new handle/name.
   */
  async saveAs(level: Level) {
    if (!isClient() || !hasFilePickers()) return false;

    const fileHandle = await getNewFileHandle();
    if (!fileHandle) return false;

    if (!(await verifyPermission(fileHandle, { withWrite: true }))) {
      return false;
    }

    this.setContent(levelToBlob(level));
    if (this.contents == null) return false;

    await writeFile(fileHandle, this.contents);
    this.handle = fileHandle;
    this.name = fileHandle.name;
    this.modified = false;
    return true;
  }

  /**
   * Drop any current handle and reset state.
   */
  reset() {
    this.handle = undefined;
    this.name = undefined;
    this.contents = null;
    this.modified = false;
  }
}

function isClient() {
  return typeof window !== "undefined";
}

function hasFilePickers() {
  return (
    typeof window !== "undefined" &&
    "showOpenFilePicker" in window &&
    "showSaveFilePicker" in window
  );
}
