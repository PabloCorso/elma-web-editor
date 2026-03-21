import type { Route } from "./+types/home";
import {
  EditorView,
  useEditorView,
  useInitialLevel,
} from "../components/editor-view";
import { EditorProvider } from "../editor/use-editor-store";
import { EditorDocumentGuardProvider } from "~/editor/document-guard";
import { ControlToolbar } from "~/editor/toolbars/control-toolbar";
import { HeaderToolbar } from "~/editor/toolbars/header-toolbar";
import { CanvasToolbar } from "~/editor/toolbars/canvas-toolbar";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { LgrAssetsProvider } from "~/components/use-lgr-assets";
import { EditorContextMenu } from "~/editor/editor-context-menu";
import { useHotkeys } from "@mantine/hooks";
import { cn } from "~/utils/misc";
import { useState } from "react";
import type { EditorEngine } from "~/editor/editor-engine";

export function meta() {
  return [
    { title: "ElastoMania Level Editor" },
    { name: "description", content: "Web-based ElastoMania Level Editor" },
  ];
}

export function loader() {
  return { isOpenAIEnabled: !!process.env.OPENAI_API_KEY };
}

export default function Home({ params, loaderData }: Route.ComponentProps) {
  return (
    <TooltipProvider>
      <LgrAssetsProvider>
        <EditorProvider>
          <EditorDocumentGuardProvider>
            <div className="flex h-[100dvh]">
              <Editor
                isOpenAIEnabled={loaderData.isOpenAIEnabled}
                initialLevelName={params.level}
              />
            </div>
          </EditorDocumentGuardProvider>
        </EditorProvider>
      </LgrAssetsProvider>
    </TooltipProvider>
  );
}

type EditorProps = { initialLevelName?: string; isOpenAIEnabled?: boolean };

function Editor({ initialLevelName, isOpenAIEnabled }: EditorProps) {
  const initialDocument = useInitialLevel(initialLevelName);
  const { canvasRef, engineRef } = useEditorView({
    initialDocument,
    isOpenAIEnabled,
  });

  return (
    <>
      <EditorToolbars
        engineRef={engineRef}
        isLoading={initialDocument.status === "loading"}
      />
      <EditorContextMenu />
      <div className="flex-1">
        <EditorView ref={canvasRef} />
      </div>
    </>
  );
}

function EditorToolbars({
  engineRef,
  isLoading,
}: {
  engineRef: React.RefObject<EditorEngine | null>;
  isLoading?: boolean;
}) {
  const [showUI, setShowUI] = useState(true);
  useHotkeys([["mod + .", () => setShowUI((state) => !state)]]);
  const showUIClassName = cn({ hidden: !showUI });
  return (
    <>
      <HeaderToolbar className={showUIClassName} isLoading={isLoading} />
      <ControlToolbar className={showUIClassName} />
      <CanvasToolbar className={showUIClassName} engineRef={engineRef} />
    </>
  );
}
