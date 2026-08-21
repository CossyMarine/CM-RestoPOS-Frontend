import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon-32x32.png", "favicon-16x16.png", "apple-touch-icon.png"],
      manifest: {
        name: "MarineCossy RestoPOS",
        short_name: "RestoPOS",
        description: "MarineCossy Restaurant point-of-sale system",
        theme_color: "#D14F58",
        background_color: "#FFFFFF",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Never cache API calls, payments, or the websocket handshake —
        // a POS must always hit the live server, never a stale cached
        // response. Only the static app shell (JS/CSS/fonts) is
        // precached, purely so reloads are fast.
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^wss?:\/\/.*\/socket\.io\/.*/,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  base: "/",
  build: {
    outDir: "dist",
  },
  server: {
    port: 3000,
    historyApiFallback: true,
  },
});