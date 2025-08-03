import type { Polygon, Position } from "elmajs";

export interface LevelData {
  polygons: Polygon[];
  apples: Position[];
  killers: Position[];
  flowers: Position[];
  start: Position;
}

export interface ImportResult {
  success: boolean;
  data?: LevelData;
  error?: string;
}

export const initialLevelData: LevelData = {
  polygons: [
    {
      vertices: [
        { x: 50, y: 50 },
        { x: 950, y: 50 },
        { x: 950, y: 550 },
        { x: 50, y: 550 },
      ],
      grass: false,
    },
  ],
  apples: [{ x: 500, y: 500 }],
  killers: [],
  flowers: [{ x: 900, y: 500 }],
  start: { x: 100, y: 500 },
};

export class LevelImporter {
  /**
   * Import level from a local file
   */
  static async importFromFile(file: File): Promise<ImportResult> {
    try {
      // Check if it's a .lev file
      if (file.name.toLowerCase().endsWith(".lev")) {
        const arrayBuffer = await file.arrayBuffer();
        return await this.parseLevFile(arrayBuffer);
      } else {
        // Fallback to JSON parsing for other file types
        const text = await file.text();
        const data = JSON.parse(text);
        return this.parseLevelData(data);
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse file: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Import built-in .lev file by filename
   */
  static async importBuiltinLevel(filename: string): Promise<ImportResult> {
    try {
      const response = await fetch(`/assets/lev/${filename}`);

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to load built-in level: HTTP ${response.status}`,
        };
      }

      const levData = await response.arrayBuffer();
      return await this.parseLevFile(levData);
    } catch (error) {
      return {
        success: false,
        error: `Failed to import built-in level: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Parse .lev file format using elmajs
   */
  private static async parseLevFile(data: ArrayBuffer): Promise<ImportResult> {
    try {
      const elmajs = await import("elmajs");
      const level = elmajs.Level.from(data);

      // Convert elmajs objects array to separate arrays by type
      const apples: Position[] = [];
      const killers: Position[] = [];
      const flowers: Position[] = [];
      let start: Position = { x: 100, y: 500 }; // Default start position

      // Scale factor to make levels larger and more visible
      const scaleFactor = 20;

      level.objects.forEach((obj: any) => {
        const position = {
          x: obj.position.x * scaleFactor,
          y: obj.position.y * scaleFactor,
        };

        switch (obj.type) {
          case 1: // Exit/Flower
            flowers.push(position);
            break;
          case 2: // Apple
            apples.push(position);
            break;
          case 3: // Killer
            killers.push(position);
            break;
          case 4: // Start
            start = position;
            break;
        }
      });

      // Scale polygons as well
      const scaledPolygons = level.polygons.map((polygon) => ({
        ...polygon,
        vertices: polygon.vertices.map((vertex) => ({
          x: vertex.x * scaleFactor,
          y: vertex.y * scaleFactor,
        })),
      }));

      const levelData: LevelData = {
        polygons: scaledPolygons,
        apples,
        killers,
        flowers,
        start,
      };

      return {
        success: true,
        data: levelData,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse .lev file: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Parse level data from various formats
   */
  private static parseLevelData(data: any): ImportResult {
    try {
      // Handle different possible data structures
      let levelData: LevelData;

      if (data.level) {
        // Elma Online API format
        levelData = this.parseElmaOnlineFormat(data.level);
      } else if (data.polygons && data.apples) {
        // Direct format (our editor format)
        levelData = data as LevelData;
      } else if (data.data) {
        // Nested data format
        levelData = this.parseElmaOnlineFormat(data.data);
      } else {
        return {
          success: false,
          error: "Unknown level data format",
        };
      }

      // Validate the parsed data
      if (!this.validateLevelData(levelData)) {
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

  /**
   * Parse Elma Online API format
   */
  private static parseElmaOnlineFormat(data: any): LevelData {
    // This is a placeholder - we'll need to adapt based on actual API response
    // For now, assume it has similar structure to our format
    return {
      polygons: data.polygons || [],
      apples: data.apples || [],
      killers: data.killers || [],
      flowers: data.flowers || [],
      start: data.start || { x: 100, y: 500 },
    };
  }

  /**
   * Validate level data structure
   */
  private static validateLevelData(data: any): data is LevelData {
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
}
