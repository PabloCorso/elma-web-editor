import {
  convertToModelMessages,
  streamText,
  tool,
  type ModelMessage,
  type Tool,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { ActionFunctionArgs } from "react-router";

export type ChatToolName =
  | "add-apples"
  | "add-killers"
  | "add-flowers"
  | "move-start"
  | "add-polygons"
  | "fit-to-view"
  | "set-level-name";

export async function action({ request }: ActionFunctionArgs) {
  const { messages } = (await request.json()) as { messages: UIMessage[] };

  if (!Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "Messages must be an array" }),
      { status: 400 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      { status: 500 }
    );
  }

  // sanitize before convertToModelMessages
  const sanitizedMessages = messages
    .map((m) => ({
      ...m,
      parts: (m.parts ?? []).filter(
        (p: any) => p.type === "text" || p.type === "image"
      ),
    }))
    .filter((m) => m.parts.length > 0);
  const modelMessages = convertToModelMessages(sanitizedMessages);

  const result = streamText({
    model: openai("gpt-5"),
    providerOptions: { openai: { reasoningEffort: "low" } },
    messages: [getSystemPrompt(), ...modelMessages],
    tools: {
      "add-apples": tool({
        description: "Add an apple to the level at a specific position",
        inputSchema: z.object({
          x: z.number().describe("X coordinate"),
          y: z.number().describe("Y coordinate"),
        }),
      }),
      "add-killers": tool({
        description: "Add a killer to the level at a specific position",
        inputSchema: z.object({
          x: z.number().describe("X coordinate"),
          y: z.number().describe("Y coordinate"),
        }),
      }),
      "add-flowers": tool({
        description: "Add a flower to the level at a specific position",
        inputSchema: z.object({
          x: z.number().describe("X coordinate"),
          y: z.number().describe("Y coordinate"),
        }),
      }),
      "move-start": tool({
        description: "Set the start position for the level",
        inputSchema: z.object({
          x: z.number().describe("X coordinate"),
          y: z.number().describe("Y coordinate"),
        }),
      }),
      "add-polygons": tool({
        description: "Add a polygon to the level",
        inputSchema: z.object({
          polygons: z.array(
            z.object({
              vertices: z.array(
                z.object({
                  x: z.number().describe("X coordinate"),
                  y: z.number().describe("Y coordinate"),
                })
              ),
            })
          ),
        }),
      }),
      "fit-to-view": tool({
        description: "Adjust the view to fit all elements on screen",
        inputSchema: z.object({}),
      }),
      "set-level-name": tool({
        description: "Set the name of the level",
        inputSchema: z.object({
          name: z.string().describe("The name for the level"),
        }),
      }),
    } satisfies Record<ChatToolName, Tool>,
  });

  return result.toUIMessageStreamResponse();
}

function getSystemPrompt(): ModelMessage {
  return {
    role: "system",
    content: `You are an AI assistant for an Elasto Mania level editor. You help users create, edit, and modify levels by using the available tools. Only do what the user asks for. For example, if the user asks for adding a polygon, you should add a polygon, and not set the level name.

## Level Structure & Guidelines:

### Terrain & Polygons:
- The Y-axis represents height, with the bottom being the floor
- The X-axis represents the width of the level
- Outer polygons should have counterclockwise winding (navigable terrain)
- Inner polygons should have clockwise winding (solid obstacles)
- Polygon lines should never cross each other
- Slopes should allow smooth navigation:
- Gentle slopes: ~0.6 pixels Y change
- Moderate slopes: ~1.2 pixels Y change  
- Steep slopes: ~2.4 pixels Y change

### Object Placement:
- All objects must be placed inside the polygonal terrain
- Start position: Place on flat surfaces near the floor with clear path forward
- Apples: Place on reachable locations, usually near floor or flat surfaces
- Killers: Place strategically to create challenges
- Flowers: Decorative elements that can be placed anywhere

### Level Sizes:
- Small levels: ~500 units wide, ~250 units tall
- Large levels: ~1000 units wide, ~500 units tall

### Input format (from user messages)
- User messages may include a line starting with "Level:" followed by minified JSON. Use ONLY the most recent occurrence in the conversation.
- Level schema:
  - name?: string
  - polygons: { vertices: { x: number, y: number }[] }[]
  - start: { x: number, y: number }
  - apples: { x: number, y: number }[]
  - killers: { x: number, y: number }[]
  - flowers: { x: number, y: number }[]
- Notes:
  - Coordinates are rounded to 2 decimals.
  - Do not echo the JSON back; use tools to make changes.
  - If no Level is present, rely on the user's natural-language instructions.

Be creative, helpful, and focus on creating fun, playable levels!`,
  };
}
