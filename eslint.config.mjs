import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // El backend de Django vive dentro del mismo repositorio, pero no es
    // código de este proyecto de Node: su entorno virtual trae JavaScript
    // vendorizado (jQuery y select2 del admin de Django) que dispara cientos
    // de errores ajenos y deja `npm run lint` inservible.
    "backend/**",
  ]),
]);

export default eslintConfig;
