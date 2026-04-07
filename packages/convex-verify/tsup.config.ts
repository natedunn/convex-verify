import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'core/index': 'src/core/index.ts',
		'utils/index': 'src/utils/index.ts',
	},
	format: ['cjs', 'esm'],
	dts: true,
	splitting: false,
	sourcemap: true,
	clean: true,
	external: ['convex'],
});
