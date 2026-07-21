import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = `http://localhost:${process.env.FINEOS_API_PORT ?? 3001}`;

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": apiTarget } },
  preview: { proxy: { "/api": apiTarget } },
});
