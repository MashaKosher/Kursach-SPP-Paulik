import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import dotenv from "dotenv";

// Load VITE_* from ./config/env/{mode}.env (we avoid .env files in this repo)
export default defineConfig(({ mode }) => {
  const envPath = path.resolve(__dirname, "config/env", `${mode}.env`);
  dotenv.config({ path: envPath, override: true });

  return {
    plugins: [vue()]
  };
});
