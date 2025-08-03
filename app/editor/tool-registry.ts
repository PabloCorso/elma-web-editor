import type { Tool } from "./tool-interface";

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private activeTool: Tool | null = null;

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  unregister(toolId: string): void {
    this.tools.delete(toolId);
    if (this.activeTool?.id === toolId) {
      this.activeTool = null;
    }
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

    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.onDeactivate?.();
    }

    // Activate new tool
    this.activeTool = tool;
    this.activeTool.onActivate?.();
    return true;
  }

  getActiveTool(): Tool | null {
    return this.activeTool;
  }
} 