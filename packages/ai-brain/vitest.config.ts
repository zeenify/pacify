import { defineConfig } from "vitest/config";

// Fast unit tests: npm test (engine-duel suites live under test/sim, run via test:sim)
export default defineConfig({
  test: {
    include: ["test/*.test.ts"],
    exclude: [],
  },
});
