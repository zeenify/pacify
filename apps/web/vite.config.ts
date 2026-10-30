import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/* @pacify/engine is consumed as raw ESM TypeScript and imports its own modules
   with explicit ".js" extensions that actually map to ".ts" sources. The default
   resolver can miss those — retry as .ts/.tsx. Same shim the old metro.config.js
   provided for Metro. */
function jsToTs(): Plugin {
  return {
    name: "pacify-js-to-ts",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || !source.startsWith(".") || !/\.js$/.test(source)) return null;
      const hit = await this.resolve(source, importer, { skipSelf: true, ...options });
      if (hit) return hit;
      return (
        (await this.resolve(source.replace(/\.js$/, ".ts"), importer, { skipSelf: true, ...options })) ??
        (await this.resolve(source.replace(/\.js$/, ".tsx"), importer, { skipSelf: true, ...options }))
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), jsToTs()],
  server: { port: 8081, strictPort: true },
  build: { outDir: "dist", target: "es2022" },
});
