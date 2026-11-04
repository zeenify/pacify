import { defineConfig } from "vitest/config";

// Node environment: these tests assert on the manifest and on pure cue timelines.
// They need node:fs and node:path, not a DOM. Deliberately NOT the app's
// vite.config.ts — that pulls in the react plugin, which these tests do not need.
export default defineConfig({
  test: {
    include: ["test/*.test.ts"],
    environment: "node",
  },
});
