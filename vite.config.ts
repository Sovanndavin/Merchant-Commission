import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/Merchant-Commission/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd())
    }
  }
});
