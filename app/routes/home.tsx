import type { Route } from "./+types/home";
import {
  EditorView,
  useEditorView,
  useInitialLevel,
} from "../components/editor-view";
import { EditorProvider } from "../editor/use-editor-store";
import { ControlToolbar } from "~/editor/toolbars/control-toolbar";
import { HeaderToolbar } from "~/editor/toolbars/header-toolbar";
import { CanvasToolbar } from "~/editor/toolbars/canvas-toolbar";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { LgrAssetsProvider } from "~/components/use-lgr-assets";
import { EditorContextMenu } from "~/editor/editor-context-menu";

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
          <div className="flex h-[100dvh]">
            <Editor
              isOpenAIEnabled={loaderData.isOpenAIEnabled}
              initialLevelName={params.level}
            />
          </div>
        </EditorProvider>
      </LgrAssetsProvider>
    </TooltipProvider>
  );
}

type EditorProps = { initialLevelName?: string; isOpenAIEnabled?: boolean };

function Editor({ initialLevelName, isOpenAIEnabled }: EditorProps) {
  const initialLevel = useInitialLevel(initialLevelName);
  const { canvasRef, engineRef } = useEditorView({
    initialLevel,
    isOpenAIEnabled,
  });
  return (
    <>
      <HeaderToolbar isLoading={initialLevel.status === "loading"} />
      <ControlToolbar />
      <CanvasToolbar engineRef={engineRef} />
      <EditorContextMenu />
      <div className="flex-1">
        <EditorView ref={canvasRef} />
      </div>
    </>
  );
}
