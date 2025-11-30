import type { Route } from "./+types/home";
import { EditorView, useEditorView } from "../components/editor-view";
import { EditorProvider } from "../editor/use-editor-store";
import { ControlToolbar } from "~/components/control-toolbar";
import { HeaderToolbar } from "~/components/header-toolbar";
import { CanvasToolbar } from "~/components/canvas-toolbar";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ElastoMania Level Editor" },
    { name: "description", content: "Web-based ElastoMania Level Editor" },
  ];
}

export function loader() {
  return { isOpenAIEnabled: !!process.env.OPENAI_API_KEY };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <EditorProvider>
      <div className="flex h-[100dvh]">
        <Editor isOpenAIEnabled={loaderData.isOpenAIEnabled} />
      </div>
    </EditorProvider>
  );
}

function Editor({ isOpenAIEnabled }: { isOpenAIEnabled?: boolean }) {
  const { canvasRef, engineRef } = useEditorView({ isOpenAIEnabled });
  return (
    <>
      <HeaderToolbar />
      <ControlToolbar />
      <CanvasToolbar engineRef={engineRef} />
      <div className="flex-1">
        <EditorView canvasRef={canvasRef} />
      </div>
    </>
  );
}
