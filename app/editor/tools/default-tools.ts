export type DefaultToolId = "select" | "vertex" | "apple" | "killer" | "flower";
export type DefaultToolMeta = {
  id: DefaultToolId;
  name: string;
  shortcut?: string;
};

export const defaultTools: Record<DefaultToolId, DefaultToolMeta> = {
  select: {
    id: "select",
    name: "Select Tool",
    shortcut: "S",
  },
  vertex: {
    id: "vertex",
    name: "Vertex Tool",
    shortcut: "V",
  },
  apple: {
    id: "apple",
    name: "Apple Tool",
    shortcut: "A",
  },
  killer: {
    id: "killer",
    name: "Killer Tool",
    shortcut: "K",
  },
  flower: {
    id: "flower",
    name: "Flower Tool",
    shortcut: "F",
  },
} as const;
