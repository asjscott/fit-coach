import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import noLeakedJsxText from "./eslint-rules/no-leaked-jsx-text.mjs";

export default defineConfig(
  globalIgnores(["**/dist/**", "**/.expo/**", ".claude/worktrees/**"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    // Typed, because only a string or number condition can leak a text node
    files: ["apps/mobile/**/*.tsx"],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    plugins: { fit: { rules: { "no-leaked-jsx-text": noLeakedJsxText } } },
    rules: { "fit/no-leaked-jsx-text": "error" },
  },
);
