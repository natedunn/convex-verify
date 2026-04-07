/**
 * Glob import for convex-test.
 * This imports all TypeScript files in the __tests__ directory for the mock backend.
 */
declare global {
	interface ImportMeta {
		glob(pattern: string): Record<string, () => Promise<unknown>>;
	}
}

export const modules = import.meta.glob("./**/*.ts");
