import path from "node:path";
import { defineConfig } from "vitest/config";

// Mirrors the "@/*" path alias in tsconfig.json so tests can import like the app does.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
