import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Permitir que /checkin y cualquier ruta SPA cargue index.html en dev
  server: { historyApiFallback: true },
  preview: { historyApiFallback: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    css: false,
  },
});
