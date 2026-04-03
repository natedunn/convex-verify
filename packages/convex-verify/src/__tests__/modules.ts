/// <reference types="vite/client" />

/**
 * Glob import for convex-test.
 * This imports all TypeScript files in the __tests__ directory for the mock backend.
 */
export const modules = import.meta.glob("./**/*.ts");
