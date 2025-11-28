import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // route("api/ai", "routes/api.ai.ts"),
] satisfies RouteConfig;
