import type { Tool } from "./tools/tool-interface";
import { useStore } from "./useStore";

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  unregister(toolId: string): void {
    this.tools.delete(toolId);
    // No need to check activeTool since we get it from store
  }

  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  activateTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return false;
    }

    // Get current active tool from store and deactivate it
    const store = useStore.getState();
    const currentToolId = store.currentTool;
    const currentTool = this.tools.get(currentToolId);
    if (currentTool) {
      currentTool.onDeactivate?.();
    }

    // Activate new tool
    tool.onActivate?.();
    return true;
  }

  getActiveTool(): Tool | null {
    const store = useStore.getState();
    const currentToolId = store.currentTool;
    return this.tools.get(currentToolId) || null;
  }
}
