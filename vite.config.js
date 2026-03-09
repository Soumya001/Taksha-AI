import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          katex:    ["katex"],
          markdown: ["react-markdown", "remark-math", "rehype-katex"],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5175,
    proxy: {
      "/api": {
        target: "http://localhost:5500",  // serve.js,
        changeOrigin: true,
      },
    },
  },
});
