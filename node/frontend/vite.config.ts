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
  server: {
    proxy: {
      "/config.js": {
        target: "http://django:8000",
        changeOrigin: true,
      },
    },
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
    process.env.SENTRY_AUTH_TOKEN
      ? sentryVitePlugin({
          org: "lateral",
          project: "coordination-network",
          url: "https://sentry.lateral.io",
        })
      : null,
  ],
});
