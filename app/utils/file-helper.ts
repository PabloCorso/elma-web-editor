import {
  getFileHandle,
  getNewFileHandle,
  readFile,
  verifyPermission,
  writeFile,
} from "./file-system-access";

export class FileSession {
  private contents = "";
  private handle?: FileSystemFileHandle;
  private name?: string;
  private modified = false;

  constructor() {}

  get snapshot() {
    return {
      contents: this.contents,
      handle: this.handle,
      name: this.name,
      modified: this.modified,
    };
  }

  setText(text: string) {
    this.contents = text;
    this.modified = true;
  }

  async open(handle?: FileSystemFileHandle) {
    const fileHandle = handle ?? (await getFileHandle());
    if (!fileHandle) return;
    if (!(await verifyPermission(fileHandle))) return;
    const file = await fileHandle.getFile();
    this.contents = await readFile(file);
    this.handle = fileHandle;
    this.name = file.name;
    this.modified = false;
  }

  async save() {
    if (!this.handle) return this.saveAs();
    await writeFile(this.handle, this.contents);
    this.modified = false;
  }

  async saveAs() {
    const fileHandle = await getNewFileHandle();
    if (!fileHandle) return;
    if (!(await verifyPermission(fileHandle, { withWrite: true }))) return;
    await writeFile(fileHandle, this.contents);
    this.handle = fileHandle;
    this.name = fileHandle.name;
    this.modified = false;
  }
}
