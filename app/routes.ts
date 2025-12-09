import { type RouteConfig, route } from "@react-router/dev/routes";

export default [route(":level?", "routes/home.tsx")] satisfies RouteConfig;
