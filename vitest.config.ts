import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@components": fileURLToPath(new URL("./src/components", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/.git/**",
      "e2e/**",
      ".next/**",
      ".storybook/**",
    ],
    setupFiles: ["./src/test/setup.ts"],
  },
});
