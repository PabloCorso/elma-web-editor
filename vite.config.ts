import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const isStorybook = process.env.npm_lifecycle_event?.includes("storybook");

export default defineConfig(async ({ mode }) => {
  const plugins = [tailwindcss(), tsconfigPaths()];

  // Only load React Router + Netlify when actually needed
  if (!isStorybook && mode !== "test") {
    const [{ reactRouter }, netlifyPlugin] = await Promise.all([
      import("@react-router/dev/vite"),
      import("@netlify/vite-plugin-react-router"), // Note: this plugin is ESM-only
    ]);
    plugins.push(reactRouter(), netlifyPlugin.default());
  }

  return {
    plugins,
    ssr: {
      noExternal: ["streamdown", "katex"],
    },
  };
});
