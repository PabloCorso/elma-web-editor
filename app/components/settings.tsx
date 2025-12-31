import {
  useEditorLevelFolderName,
  useEditorStore,
} from "~/editor/use-editor-store";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  type DialogProps,
} from "./ui/dialog";
import { useState } from "react";
import { supportsFilePickers } from "~/editor/helpers/file-session";

export function SettingsDialog(props: DialogProps) {
  const store = useEditorStore();
  const levelFolderName = useEditorLevelFolderName();
  const [_, forceUpdate] = useState(0);
  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader showCloseButton>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Application settings
        </DialogDescription>
        <DialogBody>
          <p>Elma Web Editor (beta) by Pab [dat]</p>
          <p className="text-sm">
            Desktop only. See the{" "}
            <a
              href="https://github.com/PabloCorso/elma-web-editor/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noreferrer"
              className="underline focus-visible:focus-ring"
            >
              CHANGELOG
            </a>{" "}
            for updates.
          </p>

          <div className="mt-4 border border-gray-800 rounded-lg p-3">
            {!supportsFilePickers() ? (
              <div className="flex items-center justify-between">
                <div>
                  <span>
                    Level folder{" "}
                    {levelFolderName ? (
                      <>
                        set:{" "}
                        <span className="font-semibold text-white">
                          {levelFolderName}
                        </span>
                      </>
                    ) : (
                      "not set"
                    )}
                  </span>
                </div>
                <div className="flex gap-2">
                  {levelFolderName && (
                    <button
                      className="text-sm text-red-300 underline"
                      onClick={async () => {
                        await store.getState().levelFolder?.forget();
                        forceUpdate((x) => x + 1);
                      }}
                    >
                      Forget
                    </button>
                  )}
                  <button
                    className="text-sm text-blue-300 underline"
                    onClick={async () => {
                      await store.getState().levelFolder?.pickFolder();
                      forceUpdate((x) => x + 1);
                    }}
                  >
                    {levelFolderName ? "Change" : "Set"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm">
                For the best experience, use Chrome: you can set your level
                folder here and the editor will save files directly. In other
                browsers, files will be downloaded instead of saved in place.
              </p>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
