# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

convex-verify is a TypeScript library for type-safe verification and validation of Convex database operations. It provides a plugin-based system to validate, transform, and constrain data during `insert` and `patch` operations on Convex databases.

## Commands

```bash
# Build the package (outputs to dist/)
pnpm build

# Run tests
pnpm test              # Watch mode
pnpm test:once         # Single run
pnpm test:coverage     # With coverage

# Type checking
pnpm typecheck

# Development (watch mode with sourcemaps)
pnpm dev
```

To run a single test file:
```bash
pnpm vitest run src/plugins/uniqueRowConfig.test.ts
```

## Architecture

### Core Concepts

The library uses a **two-phase execution model** for database operations:

1. **Transform Phase** - Modifies data before validation (e.g., applying default values)
2. **Validate Phase** - Checks data without modifying it (e.g., uniqueness constraints)

The main entry point is `verifyConfig()` which creates type-safe `insert`, `patch`, and `dangerouslyPatch` functions.

### Module Structure

- **`src/core/`** - Core functionality
  - `verifyConfig.ts` - Main factory function that creates insert/patch operations
  - `plugin.ts` - Plugin system (`ValidatePlugin`, `createValidatePlugin`, `runValidatePlugins`)
  - `types.ts` - All TypeScript types and type extraction helpers

- **`src/transforms/`** - Transform plugins (affect input types)
  - `defaultValuesConfig.ts` - Makes fields with defaults optional in insert types

- **`src/configs/`** - Configuration plugins (affect types)
  - `protectedColumnsConfig.ts` - Prevents certain columns from being patched

- **`src/plugins/`** - Validate plugins (runtime validation, don't affect types)
  - `uniqueRowConfig.ts` - Enforces composite index uniqueness
  - `uniqueColumnConfig.ts` - Enforces single-column uniqueness

- **`src/utils/`** - Shared utilities
  - `helpers.ts` - Index and column data utilities

### Plugin System

Plugins implement the `ValidatePlugin` interface with optional `insert` and `patch` verify functions:

```typescript
interface ValidatePlugin<Type, Config> {
  _type: Type;
  config: Config;
  verify: {
    insert?: (context: ValidateContext, data: any) => Promise<any> | any;
    patch?: (context: ValidateContext, data: any) => Promise<any> | any;
  };
}
```

### Type System

The library uses conditional types to modify input types based on configuration:
- `MakeOptional<T, K>` - Makes keys K optional in T
- `OptionalKeysForTable<VC, TN>` - Extracts which keys become optional from defaultValues
- `ProtectedKeysForTable<VC, TN>` - Extracts which keys are protected from patching

### Testing

Tests use `convex-test` with Vitest in edge-runtime environment. Test schema and modules are in `src/__tests__/`:
- `schema.ts` - Test schema with users, posts, comments tables
- `modules.ts` - Module exports for convex-test

Pattern for tests:
```typescript
const t = convexTest(schema, modules);
await t.run(async (ctx) => {
  // Use insert/patch from verifyConfig
});
```

## Package Exports

The package exports from multiple entry points:
- `convex-verify` - All exports
- `convex-verify/core` - Core plugin system
- `convex-verify/transforms` - Transform plugins
- `convex-verify/configs` - Config plugins
- `convex-verify/plugins` - Validate plugins
- `convex-verify/utils` - Utilities
