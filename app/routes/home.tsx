import type { Route } from "./+types/home";
import { EditorView } from "../components/editor-view";
import { Sidebar } from "../components/sidebar";
import { EditorStoreProvider } from "../editor/use-editor-store";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ElastoMania Level Editor" },
    { name: "description", content: "Web-based ElastoMania Level Editor" },
  ];
}

export default function Home() {
  return (
    <EditorStoreProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1">
          <EditorView />
        </div>
      </div>
    </EditorStoreProvider>
  );
}
