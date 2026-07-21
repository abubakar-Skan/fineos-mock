import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "apps/*/{src,test}/**/*.test.{ts,tsx}",
      "{src,test}/**/*.test.{ts,tsx}",
    ],
  },
});
