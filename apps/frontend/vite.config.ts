import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { Buffer } from 'buffer';

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir:"dist",
  },
  define: {
    'global.Buffer': Buffer,
  },
  resolve: {
    alias: {
      "@":"/src",
      "zod/mini": "zod",
      "buffer": "buffer",
    },
  },
});
