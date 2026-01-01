import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "apps", "frontend", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "apps", "frontend"),
  build: {
    outDir: path.resolve(import.meta.dirname, "apps", "frontend", "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@privy-io') || id.includes('@reown') || id.includes('@walletconnect')) {
              return 'wallet-vendors';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendors';
            }
            if (id.includes('ethers') || id.includes('viem')) {
              return 'web3-vendors';
            }
            return 'vendors';
          }
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
