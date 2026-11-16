import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "src/test/empty.ts") };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: "unit", include: ["src/**/*.test.ts"], exclude: ["src/**/*.db.test.ts"], environment: "node" } },
      {
        resolve: { alias },
        test: { name: "db", include: ["src/**/*.db.test.ts"], environment: "node", testTimeout: 30_000, pool: "forks", poolOptions: { forks: { singleFork: true } } },
      },
    ],
  },
});
