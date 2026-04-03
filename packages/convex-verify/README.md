# convex-verify

Type-safe verification and validation for Convex database operations.


## Features

- **Type-safe insert/patch** - Full TypeScript inference for your schema
- **Default values** - Make fields optional in `insert()` with automatic defaults
- **Protected columns** - Prevent accidental updates to critical fields in `patch()`
- **Unique constraints** - Enforce unique rows and columns using your indexes
- **Extensible** - Create your own validation extensions

## Installation

```bash
pnpm install convex-verify
```

**Peer Dependencies:**

- `convex` >= 1.34.1

## Quick Start

```ts
import {
	defaultValuesConfig,
	protectedColumnsConfig,
	uniqueColumnConfig,
	uniqueRowConfig,
	verifyConfig,
} from "convex-verify";

import schema from "./schema";

export const { insert, patch, dangerouslyPatch } = verifyConfig(schema, {
	defaultValues: defaultValuesConfig(schema, {
		posts: { status: "draft", views: 0 },
	}),

	protectedColumns: protectedColumnsConfig(schema, {
		posts: ["authorId"],
	}),

	uniqueRow: uniqueRowConfig(schema, {
		posts: ["by_author_slug"],
	}),

	uniqueColumn: uniqueColumnConfig(schema, {
		users: ["by_email", "by_username"],
	}),
});
```

Then use in your mutations:

```ts
import { insert, patch } from "./verify";

export const createPost = mutation({
	args: { title: v.string(), content: v.string() },
	handler: async (ctx, args) => {
		// status and views are optional since defaults have been set
		return await insert(ctx, "posts", {
			title: args.title,
			content: args.content,
			authorId: ctx.auth.userId,
		});
	},
});

export const updatePost = mutation({
	args: { id: v.id("posts"), title: v.string() },
	handler: async (ctx, args) => {
		// authorId is protected - TypeScript won't allow it here
		await patch(ctx, "posts", args.id, {
			title: args.title,
			// authorId: "someone_else", // TypeScript error!
		});
	},
});
```

---

## API Reference

### `verifyConfig(schema, config)`

Main configuration function that returns typed `insert`, `patch`, and `dangerouslyPatch` functions.

```ts
const { insert, patch, dangerouslyPatch } = verifyConfig(schema, {
  defaultValues?: DefaultValuesConfig,
  protectedColumns?: ProtectedColumnsConfig,
  uniqueRow?: UniqueRowConfig,
  uniqueColumn?: UniqueColumnConfig,
  extensions?: Extension[],
});
```

#### Returns

| Function           | Description                                                                         |
| ------------------ | ----------------------------------------------------------------------------------- |
| `insert`           | Insert with default values applied and extensions run                               |
| `patch`            | Patch with protected columns removed and extensions run                             |
| `dangerouslyPatch` | Patch with full access to all columns (bypasses protected columns type restriction) |

---

## `defaultValuesConfig`

Makes specified fields optional in `insert()` by providing default values. The types update automatically - fields with defaults become optional.

```ts
import { defaultValuesConfig } from "convex-verify";
```

### Static Values

```ts
const config = defaultValuesConfig(schema, {
	posts: { status: "draft", views: 0 },
	comments: { likes: 0 },
});
```

### Dynamic Values

Use a function when values should be generated fresh on each insert:

```ts
const config = defaultValuesConfig(schema, () => ({
	posts: {
		status: "draft",
		slug: generateRandomSlug(),
		createdAt: Date.now(),
	},
}));
```

### Async Values

```ts
const config = defaultValuesConfig(schema, async () => ({
	posts: {
		category: await fetchDefaultCategory(),
	},
}));
```

---

## `protectedColumnsConfig`

Removes specified columns from the `patch()` input type, preventing accidental updates to critical fields like `authorId` or `createdAt`.

```ts
import { protectedColumnsConfig } from "convex-verify";
```

### Usage

```ts
const config = protectedColumnsConfig(schema, {
	posts: ["authorId", "createdAt"],
	comments: ["postId", "authorId"],
});
```

### Bypassing Protection

Use `dangerouslyPatch()` when you legitimately need to update protected columns:

```ts
// Regular patch - authorId not allowed
await patch(ctx, "posts", id, {
	authorId: newAuthorId, // TypeScript error!
	title: "New Title", // OK
});

// Dangerous patch - full access
await dangerouslyPatch(ctx, "posts", id, {
	authorId: newAuthorId, // OK (bypasses type restriction)
	title: "New Title",
});
```

**Note:** `dangerouslyPatch()` still runs validation extensions - only the type restriction is bypassed.

---

## `uniqueRowConfig`

Enforces uniqueness across multiple columns using composite indexes. Useful for things like "unique slug per author" or "unique name per organization".

```ts
import { uniqueRowConfig } from "convex-verify";
```

### Usage

```ts
const config = uniqueRowConfig(schema, {
	posts: ["by_author_slug"], // Unique author + slug combination
	projects: ["by_org_name"], // Unique org + name combination
});
```

### With Options

```ts
const config = uniqueRowConfig(schema, {
	posts: [
		{
			index: "by_author_slug",
			identifiers: ["_id", "authorId"], // Fields that identify "same document"
		},
	],
});
```

The `identifiers` option controls which fields are checked when determining if a conflicting row is actually the same document (useful during patch operations).

---

## `uniqueColumnConfig`

Enforces uniqueness on single columns using indexes. Useful for email addresses, usernames, slugs, etc.

```ts
import { uniqueColumnConfig } from "convex-verify";
```

### Usage

```ts
const config = uniqueColumnConfig(schema, {
	users: ["by_email", "by_username"],
	organizations: ["by_slug"],
});
```

The column name is derived from the index name by removing the `by_` prefix:

- `by_username` → checks `username` column
- `by_email` → checks `email` column

### With Options

```ts
const config = uniqueColumnConfig(schema, {
	users: [
		"by_username",
		{ index: "by_email", identifiers: ["_id", "clerkId"] },
	],
});
```

---

## Custom Extensions

Custom extensions let you add your own validation and transformation logic that runs during `insert()` and `patch()` operations.

### Use Cases

- **Authorization checks** - Verify the user has permission to create/modify a document
- **Data validation** - Check that values meet business rules (e.g., positive numbers, valid URLs)
- **Cross-field validation** - Ensure fields are consistent with each other
- **Normalization / sanitization** - Lowercase emails, trim slugs, clean incoming strings
- **External validation** - Check against external APIs or services
- **Audit logging** - Log operations before they complete

### Limitations

- Extensions run **after** type-affecting configs (like `defaultValues`) have been applied
- Extensions **cannot modify types** - they can change runtime data, but not the TypeScript types
- Extensions may **return modified data** - use this to sanitize, normalize, or enrich payloads
- Custom extensions from `extensions: []` run **before** built-in `uniqueRow` / `uniqueColumn` configs
- `patch()` still strips protected columns at runtime; use `dangerouslyPatch()` if an extension must change them
- Extension errors should use `ConvexError` for proper error handling on the client

### Creating an Extension

Use `createExtension`. If you want schema-aware typing in the callback, pass your schema type as the generic:

```ts
import { createExtension } from "convex-verify";
import { ConvexError } from "convex/values";

const normalizeEmail = createExtension<typeof schema>((input) => {
	if (input.tableName !== "users") {
		return input.data;
	}

	if (input.operation === "insert") {
		return {
			...input.data,
			email: input.data.email.toLowerCase().trim(),
		};
	}

	return {
		...input.data,
		...(input.data.email !== undefined && {
			email: input.data.email.toLowerCase().trim(),
		}),
	};
});
```

Use a single `input` parameter instead of destructuring when you want narrowing.
That lets TypeScript narrow `data` from both `tableName` and `operation`.

### Extension Context

Your extension function receives:

```ts
type ExtensionInput = {
	ctx: GenericMutationCtx; // Convex mutation context (has ctx.db, etc.)
	tableName: string; // Table being operated on
	operation: "insert" | "patch";
	patchId?: GenericId; // Document ID (patch only)
	schema: SchemaDefinition; // Schema reference
	data: unknown;
};
```

### Example: Required Fields

```ts
const requiredFields = createExtension<typeof schema>((input) => {
	if (input.tableName !== "posts" || input.operation === "patch") {
		return input.data;
	}

	for (const field of ["title", "content"]) {
		if (!input.data[field]) {
			throw new ConvexError({
				code: "VALIDATION_ERROR",
				message: `Missing required field: ${field}`,
			});
		}
	}

	return input.data;
});
```

### Example: Async Authorization Check

```ts
const ownership = createExtension<typeof schema>(async (input) => {
	if (input.tableName !== "posts" || input.operation !== "patch") {
		return input.data;
	}

	const doc = await input.ctx.db.get(input.patchId);
	const identity = await input.ctx.auth.getUserIdentity();

	if (doc?.ownerId !== identity?.subject) {
		throw new ConvexError({
			code: "UNAUTHORIZED",
			message: "You don't have permission to edit this document",
		});
	}

	return input.data;
});
```

### Using Custom Extensions

Add extensions to the `extensions` array in your config:

```ts
const { insert, patch } = verifyConfig(schema, {
	extensions: [requiredFields, ownership],
});
```

---

## Error Handling

### `onFail` Callback

Operations accept an optional `onFail` callback for handling validation failures:

```ts
await insert(ctx, "posts", data, {
	onFail: (args) => {
		if (args.uniqueRow) {
			console.log("Duplicate row:", args.uniqueRow.existingData);
		}
		if (args.uniqueColumn) {
			console.log("Duplicate column:", args.uniqueColumn.conflictingColumn);
		}
	},
});
```

### Error Types

Built-in validation extensions throw `ConvexError` with these codes:

- `UNIQUE_ROW_VERIFICATION_ERROR` - Duplicate row detected
- `UNIQUE_COLUMN_VERIFICATION_ERROR` - Duplicate column value detected

---

## TypeScript

This library provides full type inference:

- `insert()` types reflect optional fields from `defaultValues`
- `patch()` types exclude protected columns
- All configs are type-checked against your schema
- Index names are validated against your schema's indexes

---

## License

MIT
