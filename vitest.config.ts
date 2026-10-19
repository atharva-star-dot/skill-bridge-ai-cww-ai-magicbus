import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "tests/**/*.int.test.ts"],
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "scripts/**/*.test.ts",
    ],
  },
});
