export type DefaultToolId = "select" | "vertex" | "apple" | "killer" | "flower";
export type DefaultToolMeta = {
  id: DefaultToolId;
  name: string;
  shortcut?: string;
};

export const defaultTools: Record<DefaultToolId, DefaultToolMeta> = {
  select: { id: "select", name: "Select tool", shortcut: "S" },
  vertex: { id: "vertex", name: "Vertex tool", shortcut: "V" },
  apple: { id: "apple", name: "Apple", shortcut: "A" },
  killer: { id: "killer", name: "Killer", shortcut: "K" },
  flower: { id: "flower", name: "Flower", shortcut: "F" },
} as const;
