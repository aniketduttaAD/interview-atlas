import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.claude/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Serwist build output (generated, minified)
    'public/sw.js',
    'public/sw.js.map',
    'public/swe-worker-*.js',
    'public/swe-worker-*.js.map',
  ]),
]);

export default eslintConfig;
