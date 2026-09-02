import { defineConfig } from "vitest/config";

// Slower sim-backed suites (real engine duels): npm run test:sim
// Single fork: multi-second synchronous solves starve worker IPC heartbeats.
export default defineConfig({
  test: {
    include: ["test/sim/**/*.test.ts"],
    testTimeout: 300_000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
