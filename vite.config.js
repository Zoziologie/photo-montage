import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH || (mode === "production" ? "/photo-montage/" : "/");
  const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version || "0.0.0"),
    },
    plugins: [vue()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
