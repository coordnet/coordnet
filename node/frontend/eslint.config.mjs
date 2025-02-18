import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import hooksPlugin from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactPlugin from "eslint-plugin-react";

export default [
  // Ignore dirs
  { ignores: ["dist/", ".vite/"] },

  // Typescript eslint
  ...tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended),

  // React
  {
    // Ignore components they come from shadcn/ui
    ignores: ["src/components/ui/**/*"],
    ...reactPlugin.configs.flat.recommended,
  },

  // React hooks
  {
    plugins: { "react-hooks": hooksPlugin },
    rules: {
      "react/react-in-jsx-scope": "off",
      ...hooksPlugin.configs.recommended.rules,
    },
    ignores: ["*.test.tsx"],
  },

  // React refresh
  {
    plugins: { "react-refresh": reactRefresh },
    rules: { "react-refresh/only-export-components": "warn" },
  },
];
