import type { Route } from "./+types/home";
import { EditorView } from "../components/editor-view";
import { EditorStoreProvider } from "../editor/use-editor-store";
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
  return {
    isOpenAIEnabled: !!process.env.OPENAI_API_KEY,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { isOpenAIEnabled } = loaderData;

  return (
    <EditorStoreProvider>
      <div className="flex h-screen">
        {/* <Sidebar isOpenAIEnabled={isOpenAIEnabled} /> */}
        <HeaderToolbar />
        <ControlToolbar isOpenAIEnabled={isOpenAIEnabled} />
        <CanvasToolbar />
        <div className="flex-1">
          <EditorView isOpenAIEnabled={isOpenAIEnabled} />
        </div>
      </div>
    </EditorStoreProvider>
  );
}
