export async function getFileHandle() {
  if (!("showOpenFilePicker" in window)) return;

  return window.showOpenFilePicker().then((handles) => handles[0]);
}

export async function getNewFileHandle() {
  if (!("showSaveFilePicker" in window)) return;

  const opts = {
    types: [
      {
        description: "Text file",
        accept: { "text/plain": [".txt"] },
      },
    ],
  };

  return window.showSaveFilePicker(opts);
}

export async function readFile(file: File): Promise<string> {
  return file.text();
}

export async function writeFile(
  fileHandle: FileSystemFileHandle,
  contents: string
) {
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

/**
 * Verify the user has granted permission to read or write to the file, if
 * permission hasn't been granted, request permission.
 */
export async function verifyPermission(
  fileHandle: FileSystemFileHandle,
  { withWrite }: { withWrite: boolean } = { withWrite: false }
) {
  const opts: any = {};
  if (withWrite) {
    opts.writable = true;
    opts.mode = "readwrite";
  }

  if ((await fileHandle.queryPermission(opts)) === "granted") return true;
  if ((await fileHandle.requestPermission(opts)) === "granted") return true;
  return false;
}
