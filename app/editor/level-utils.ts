import { Gravity, type Polygon, type Position } from "elmajs";
import type { Apple, Picture } from "./editor.types";

export type LevelData = {
  name?: string;
  polygons: Polygon[];
  apples: Apple[];
  killers: Position[];
  flowers: Position[];
  start: Position;
  pictures: Picture[];
};

export type ImportResult = {
  success: boolean;
  data?: LevelData;
  error?: string;
};

export const initialLevelData: LevelData = {
  polygons: [
    {
      vertices: [
        { x: 2.5, y: 2.5 },
        { x: 47.5, y: 2.5 },
        { x: 47.5, y: 27.5 },
        { x: 2.5, y: 27.5 },
      ],
      grass: false,
    },
  ],
  apples: [{ position: { x: 25, y: 25 }, animation: 1, gravity: Gravity.None }],
  killers: [],
  flowers: [{ x: 45, y: 25 }],
  start: { x: 5, y: 25 },
  pictures: [],
};

export async function importFromFile(file: File): Promise<ImportResult> {
  try {
    // Check if it's a .lev file
    if (file.name.toLowerCase().endsWith(".lev")) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await parseLevFile(arrayBuffer);

      // Set the level name based on the filename if not already set
      if (result.success && result.data && !result.data.name) {
        result.data.name = file.name.replace(".lev", "");
      }

      return result;
    } else {
      // Fallback to JSON parsing for other file types
      const text = await file.text();
      const data = JSON.parse(text);
      return parseLevelData(data);
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse file: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function importBuiltinLevel(
  filename: string
): Promise<ImportResult> {
  try {
    const response = await fetch(`/assets/lev/${filename}`);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to load built-in level: HTTP ${response.status}`,
      };
    }

    const levData = await response.arrayBuffer();
    const result = await parseLevFile(levData);

    // Set the level name based on the filename if not already set
    if (result.success && result.data && !result.data.name) {
      result.data.name = filename.replace(".lev", "");
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Failed to import built-in level: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function parseLevFile(data: ArrayBuffer): Promise<ImportResult> {
  try {
    const elmajs = await import("elmajs");
    const level = elmajs.Level.from(data);

    // Convert elmajs objects array to separate arrays by type
    const apples: Apple[] = [];
    const killers: Position[] = [];
    const flowers: Position[] = [];
    let start: Position = { x: 5, y: 5 }; // Default start position

    level.objects.forEach((obj) => {
      const position = { x: obj.position.x, y: obj.position.y };

      switch (obj.type) {
        case 1: // Exit/Flower
          flowers.push(position);
          break;
        case 2: // Apple
          apples.push({ position, animation: 1, gravity: Gravity.None });
          break;
        case 3: // Killer
          killers.push(position);
          break;
        case 4: // Start
          start = position;
          break;
      }
    });

    const levelData: LevelData = {
      name: level.name,
      polygons: level.polygons,
      apples,
      killers,
      flowers,
      start,
      pictures: level.pictures,
    };

    return { success: true, data: levelData };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse .lev file: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function parseLevelData(data: any): ImportResult {
  try {
    // Handle different possible data structures
    let levelData: LevelData;

    if (data.level) {
      // Elma Online API format
      levelData = parseElmaOnlineFormat(data.level);
    } else if (data.polygons && data.apples) {
      // Direct format (our editor format)
      levelData = data as LevelData;
    } else if (data.data) {
      // Nested data format
      levelData = parseElmaOnlineFormat(data.data);
    } else {
      return {
        success: false,
        error: "Unknown level data format",
      };
    }

    // Validate the parsed data
    if (!validateLevelData(levelData)) {
      return {
        success: false,
        error: "Invalid level data structure",
      };
    }

    return {
      success: true,
      data: levelData,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse level data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function parseElmaOnlineFormat(data: any): LevelData {
  // This is a placeholder - we'll need to adapt based on actual API response
  // For now, assume it has similar structure to our format
  return {
    polygons: data.polygons || [],
    apples: data.apples || [],
    killers: data.killers || [],
    flowers: data.flowers || [],
    start: data.start || { x: 100, y: 500 },
    pictures: data.pictures || [],
  };
}

function validateLevelData(data: any): data is LevelData {
  return (
    Array.isArray(data.polygons) &&
    Array.isArray(data.apples) &&
    Array.isArray(data.killers) &&
    Array.isArray(data.flowers) &&
    typeof data.start === "object" &&
    typeof data.start.x === "number" &&
    typeof data.start.y === "number"
  );
}
