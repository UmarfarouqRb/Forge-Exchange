
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: ["../../tsconfig.base.json"] })],
  base: "/", // correct for Render
  build: {
    outDir: path.resolve(__dirname, "dist"), 
    emptyOutDir: true,
  },
});
