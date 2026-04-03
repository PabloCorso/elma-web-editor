export default {
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./app/styles/tailwind.css",
  tailwindAttributes: ["class", "className", "ngClass", ".*[cC]lassName"],
  tailwindFunctions: ["clsx", "cn", "cva"],
};
