import type { Route } from "./+types/home";
import {
  EditorView,
  useEditorView,
  useInitialLevel,
} from "../components/editor-view";
import { EditorProvider } from "../editor/use-editor-store";
import { DefaultLevelPresetProvider } from "../editor/default-level-preset";
import { EditorDocumentGuardProvider } from "~/editor/document-guard";
import { ControlToolbar } from "~/editor/toolbars/control-toolbar";
import { HeaderToolbar } from "~/editor/toolbars/header-toolbar";
import { CanvasToolbar } from "~/editor/toolbars/canvas-toolbar";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { LgrAssetsProvider } from "~/components/use-lgr-assets";
import { EditorContextMenu } from "~/editor/editor-context-menu";
import { useHotkeys } from "@mantine/hooks";
import type { EditorEngine } from "~/editor/editor-engine";
import { lazy, Suspense } from "react";
import {
  useEditorActions,
  useEditorIsUIVisible,
  useEditorIsPlayMode,
} from "~/editor/use-editor-store";

const LazyPlayModeOverlay = lazy(async () => {
  const module = await import("~/editor/play-mode");
  return { default: module.PlayMode };
});

export function meta() {
  return [
    { title: "Bear Level Editor" },
    { name: "description", content: "Web-based level editor for ElastoMania" },
  ];
}

export function loader() {
  return { isOpenAIEnabled: !!process.env.OPENAI_API_KEY };
}

export default function Home({ params, loaderData }: Route.ComponentProps) {
  return (
    <TooltipProvider>
      <LgrAssetsProvider>
        <DefaultLevelPresetProvider>
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
        </DefaultLevelPresetProvider>
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
  const isPlayMode = useEditorIsPlayMode();

  return (
    <>
      <div className="relative flex-1">
        <EditorView ref={canvasRef} />
        {isPlayMode ? (
          <Suspense fallback={<PlayModeOverlayFallback />}>
            <LazyPlayModeOverlay />
          </Suspense>
        ) : null}
      </div>
      <EditorToolbars
        engineRef={engineRef}
        isLoading={initialDocument.status === "loading"}
      />
      <EditorContextMenu />
    </>
  );
}

function PlayModeOverlayFallback() {
  return (
    <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/8">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-white/80 shadow-sm backdrop-blur-sm">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/75" />
        <span>Starting play mode</span>
      </div>
    </div>
  );
}

function EditorToolbars({
  engineRef,
  isLoading,
}: {
  engineRef: React.RefObject<EditorEngine | null>;
  isLoading?: boolean;
}) {
  const { toggleUIVisibility } = useEditorActions();
  const isUIVisible = useEditorIsUIVisible();
  const isPlayMode = useEditorIsPlayMode();
  useHotkeys([["mod + .", () => toggleUIVisibility()]]);

  if (!isUIVisible || isPlayMode) return null;
  return (
    <>
      <HeaderToolbar isLoading={isLoading} />
      <ControlToolbar />
      <CanvasToolbar engineRef={engineRef} />
    </>
  );
}
