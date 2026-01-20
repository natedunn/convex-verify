# convex-verify

Type-safe verification and validation for Convex database operations.

## Features

- **Type-safe insert/patch** - Full TypeScript inference for your schema
- **Default values** - Make fields optional in `insert()` with automatic defaults
- **Protected columns** - Prevent accidental updates to critical fields in `patch()`
- **Unique constraints** - Enforce unique rows and columns using your indexes
- **Extensible** - Create your own validation plugins

## Installation

```bash
pnpm install convex-verify
```

**Peer Dependencies:**

- `convex` >= 1.31.3

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
  plugins?: ValidatePlugin[],
});
```

#### Returns

| Function           | Description                                                                         |
| ------------------ | ----------------------------------------------------------------------------------- |
| `insert`           | Insert with default values applied and validation plugins run                       |
| `patch`            | Patch with protected columns removed from type and validation plugins run           |
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

**Note:** `dangerouslyPatch()` still runs validation plugins - only the type restriction is bypassed.

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

## Custom Plugins

Custom plugins let you add your own validation logic that runs during `insert()` and `patch()` operations.

### Use Cases

- **Authorization checks** - Verify the user has permission to create/modify a document
- **Data validation** - Check that values meet business rules (e.g., positive numbers, valid URLs)
- **Cross-field validation** - Ensure fields are consistent with each other
- **External validation** - Check against external APIs or services
- **Audit logging** - Log operations before they complete

### Limitations

- Plugins run **after** type-affecting configs (like `defaultValues`) have been applied
- Plugins **cannot modify types** - they validate data but don't change the TypeScript types
- Plugins should **return the data unchanged** - they're for validation, not transformation
- Plugin errors should use `ConvexError` for proper error handling on the client

### Creating a Plugin

Use `createValidatePlugin` to create a plugin:

```ts
import { createValidatePlugin } from "convex-verify";
import { ConvexError } from "convex/values";

const myPlugin = createValidatePlugin(
	"pluginName", // Unique identifier
	{
		/* config */
	}, // Your configuration object
	{
		insert: (context, data) => {
			// Validation logic for inserts
			return data;
		},
		patch: (context, data) => {
			// Validation logic for patches
			return data;
		},
	},
);
```

### Plugin Context

Your plugin functions receive a context object:

```ts
type ValidateContext = {
	ctx: GenericMutationCtx; // Convex mutation context (has ctx.db, etc.)
	tableName: string; // Table being operated on
	operation: "insert" | "patch";
	patchId?: GenericId; // Document ID (patch only)
	schema?: SchemaDefinition; // Schema reference
};
```

### Example: Required Fields

```ts
const requiredFieldsPlugin = createValidatePlugin(
	"requiredFields",
	{ fields: ["title", "content"] },
	{
		insert: (context, data) => {
			for (const field of context.config.fields) {
				if (!data[field]) {
					throw new ConvexError({
						code: "VALIDATION_ERROR",
						message: `Missing required field: ${field}`,
					});
				}
			}
			return data;
		},
	},
);
```

### Example: Async Authorization Check

```ts
const ownershipPlugin = createValidatePlugin(
	"checkOwnership",
	{},
	{
		patch: async (context, data) => {
			const doc = await context.ctx.db.get(context.patchId);
			const identity = await context.ctx.auth.getUserIdentity();

			if (doc?.ownerId !== identity?.subject) {
				throw new ConvexError({
					code: "UNAUTHORIZED",
					message: "You don't have permission to edit this document",
				});
			}
			return data;
		},
	},
);
```

### Using Custom Plugins

Add plugins to the `plugins` array in your config:

```ts
const { insert, patch } = verifyConfig(schema, {
	plugins: [requiredFieldsPlugin, ownershipPlugin],
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

Built-in validation plugins throw `ConvexError` with these codes:

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
