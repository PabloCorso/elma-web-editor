export type DefaultToolId =
  | "select"
  | "hand"
  | "vertex"
  | "apple"
  | "killer"
  | "flower"
  | "picture";
export type DefaultToolMeta = {
  id: DefaultToolId;
  name: string;
  shortcut?: string;
};

export const defaultTools: Record<DefaultToolId, DefaultToolMeta> = {
  select: { id: "select", name: "Select tool", shortcut: "S" },
  hand: { id: "hand", name: "Hand tool", shortcut: "H" },
  vertex: { id: "vertex", name: "Vertex tool", shortcut: "V" },
  apple: { id: "apple", name: "Apple", shortcut: "A" },
  killer: { id: "killer", name: "Killer", shortcut: "K" },
  flower: { id: "flower", name: "Flower", shortcut: "F" },
  picture: { id: "picture", name: "Picture", shortcut: "P" },
} as const;
