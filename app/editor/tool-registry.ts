import type { Tool } from "./tools/tool-interface";
import type { StoreApi } from "zustand/vanilla";
import type { EditorState } from "./editor-store";

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  constructor(private store: StoreApi<EditorState>) {}

  private isValidEditorTool(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  private get state() {
    return this.store.getState();
  }

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  unregister(toolId: string): void {
    this.tools.delete(toolId);
  }

  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getRegisteredToolIds(): string[] {
    return Array.from(this.tools.keys());
  }

  activateTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return false;
    }

    // Validate that toolId is registered
    if (!this.isValidEditorTool(toolId)) {
      console.warn(
        `Tool '${toolId}' is not registered. Available tools: ${this.getRegisteredToolIds().join(", ")}`
      );
      return false;
    }

    // Get current active tool from store and deactivate it
    const currentToolId = this.state.currentToolId;
    const currentTool = this.tools.get(currentToolId);
    if (currentTool && currentTool.onDeactivate) {
      currentTool.onDeactivate();
    }

    // Update store with new tool
    this.store.getState().setCurrentToolId(toolId);

    // Activate new tool
    if (tool.onActivate) {
      tool.onActivate();
    }
    return true;
  }

  getActiveTool(): Tool | null {
    const currentToolId = this.state.currentToolId;
    return this.tools.get(currentToolId) || null;
  }
}
