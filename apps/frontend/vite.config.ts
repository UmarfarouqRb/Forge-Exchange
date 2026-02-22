import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir:"dist",
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      "@":"/src",
      "zod/mini": "zod",
    },
  },
});
