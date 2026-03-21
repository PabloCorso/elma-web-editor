import { describe, expect, it } from "vitest";
import { Gravity, Texture } from "../elma-types";
import type { EditorState } from "../editor-state";
import {
  editorLevelFromFile,
  elmaLevelFromEditorState,
} from "./level-parser";

describe("level parser apple gravity", () => {
  it("preserves apple gravity and animation when saving and reloading a level", async () => {
    const level = elmaLevelFromEditorState({
      levelName: "Gravity Test",
      ground: Texture.Ground,
      sky: Texture.Sky,
      polygons: [
        {
          vertices: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
          ],
          grass: false,
        },
      ],
      apples: [
        {
          position: { x: 5, y: 5 },
          animation: 2,
          gravity: Gravity.Left,
        },
      ],
      killers: [],
      flowers: [{ x: 8, y: 8 }],
      start: { x: 1, y: 1 },
      pictures: [],
    } as unknown as Pick<
      EditorState,
      | "levelName"
      | "ground"
      | "sky"
      | "polygons"
      | "apples"
      | "killers"
      | "flowers"
      | "start"
      | "pictures"
    > as Parameters<typeof elmaLevelFromEditorState>[0]);

    const file = new File([new Uint8Array(level.toBuffer())], "gravity.lev", {
      type: "application/octet-stream",
    });

    const imported = await editorLevelFromFile(file);

    expect(imported.apples).toHaveLength(1);
    expect(imported.apples[0]).toMatchObject({
      animation: 2,
      gravity: Gravity.Left,
      position: { x: 5, y: 5 },
    });
  });
});
