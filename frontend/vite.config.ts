import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: "esnext",

    rollupOptions: {
      output: {
        entryFileNames: `static/[name].js`,
        chunkFileNames: `static/[name].js`,
        assetFileNames: `static/[name].[ext]`,
      },
    },

    sourcemap: true,
  },
  esbuild: {
    target: "esnext",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  plugins: [
    tsconfigPaths(),
    react(),
    sentryVitePlugin({
      org: "lateral",
      project: "coordination-network",
      url: "https://sentry.lateral.io",
    }),
  ],
});
