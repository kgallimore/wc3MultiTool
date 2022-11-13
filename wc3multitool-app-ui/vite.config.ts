import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      "assets/": resolve(__dirname, "src/components/"),
    },
  },
  build: {
    outDir: "./../public",
    rollupOptions: {
      external: ["./assets/index.css"],
      input: "./svelte.html",
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});
