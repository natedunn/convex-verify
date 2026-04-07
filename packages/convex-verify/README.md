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
import { verifyConfig } from "convex-verify";

import schema from "./schema";

export const { insert, patch, dangerouslyPatch, verify, config } = verifyConfig(schema, {
	defaultValues: {
		posts: { status: "draft", views: 0 },
	},

	protectedColumns: {
		posts: ["authorId"],
	},

	uniqueRow: {
		posts: ["by_author_slug"],
	},

	uniqueColumn: {
		users: ["by_email", "by_username"],
	},
});
```

Use the returned helpers in mutations:

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

And use the returned verifier surface directly when you need schema-aware built-in checks outside the insert/patch helpers:

```ts
await verify.uniqueRow(ctx, "posts", {
	title: "Hello",
	slug: "hello",
	authorId: "author-1",
});

config.uniqueRow.posts; // typed configured options
```

---

## API Reference

### `verifyConfig(schema, config)`

Main configuration function. It accepts inline schema-aware config and returns typed mutation helpers plus a direct `verify` registry.

```ts
const { insert, patch, dangerouslyPatch, verify, config } = verifyConfig(schema, {
  defaultValues?: {
    posts?: { status?: "draft"; views?: number };
  } | (() => { ... } | Promise<{ ... }>),
  protectedColumns?: {
    posts?: ["authorId"];
  },
  uniqueRow?: {
    posts?: ["by_author_slug"];
  },
  uniqueColumn?: {
    users?: ["by_email", "by_username"];
  },
  extensions?: Extension[],
});
```

#### Returns

| Function/Value     | Description                                                                         |
| ------------------ | ----------------------------------------------------------------------------------- |
| `insert`           | Insert with default values applied and extensions run                               |
| `patch`            | Patch with protected columns removed and extensions run                             |
| `dangerouslyPatch` | Patch with full access to all columns (bypasses protected columns type restriction) |
| `verify`           | Built-in verifier functions for configured features only                            |
| `config`           | Passive typed snapshot of the built-in config that was passed in                    |

---

## `defaultValues`

Makes specified fields optional in `insert()` by providing default values. The types update automatically.

### Static Values

```ts
const { insert } = verifyConfig(schema, {
	defaultValues: {
	posts: { status: "draft", views: 0 },
	comments: { likes: 0 },
	},
});
```

### Dynamic Values

Use a function when values should be generated fresh on each insert:

```ts
const { insert } = verifyConfig(schema, {
	defaultValues: () => ({
		posts: {
			status: "draft",
			slug: generateRandomSlug(),
			createdAt: Date.now(),
		},
	}),
});
```

### Async Values

```ts
const { insert } = verifyConfig(schema, {
	defaultValues: async () => ({
		posts: {
			category: await fetchDefaultCategory(),
		},
	}),
});
```

### Direct Verifier Calls

```ts
const { verify } = verifyConfig(schema, {
	defaultValues: {
		users: { status: "pending" },
	},
});

const user = await verify.defaultValues("users", {
	email: "alice@example.com",
	username: "alice",
});
```

---

## `protectedColumns`

Removes specified columns from the `patch()` input type, preventing accidental updates to critical fields like `authorId` or `createdAt`.

### Usage

```ts
const { patch, dangerouslyPatch } = verifyConfig(schema, {
	protectedColumns: {
		posts: ["authorId", "createdAt"],
		comments: ["postId", "authorId"],
	},
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

## `uniqueRow`

Enforces uniqueness across multiple columns using composite indexes. Useful for things like "unique slug per author" or "unique name per organization".

### Usage

```ts
const { verify } = verifyConfig(schema, {
	uniqueRow: {
		posts: ["by_author_slug"], // Unique author + slug combination
		projects: ["by_org_name"], // Unique org + name combination
	},
});
```

### With Options

```ts
const { verify } = verifyConfig(schema, {
	uniqueRow: {
		posts: [
			{
				index: "by_author_slug",
				identifiers: ["_id", "authorId"], // Fields that identify "same document"
			},
		],
	},
});
```

The `identifiers` option controls which fields are checked when determining if a conflicting row is actually the same document (useful during patch operations).

---

## `uniqueColumn`

Enforces uniqueness on single columns using indexes. Useful for email addresses, usernames, slugs, etc.

### Usage

```ts
const { verify } = verifyConfig(schema, {
	uniqueColumn: {
		users: ["by_email", "by_username"],
		organizations: ["by_slug"],
	},
});
```

The column name is derived from the index name by removing the `by_` prefix:

- `by_username` → checks `username` column
- `by_email` → checks `email` column

### With Options

```ts
const { verify } = verifyConfig(schema, {
	uniqueColumn: {
		users: [
			"by_username",
			{ index: "by_email", identifiers: ["_id", "clerkId"] },
		],
	},
});
```

### Direct Verifier Calls

```ts
await verify.uniqueColumn(ctx, "users", {
	email: "alice@example.com",
});
```

Patch checks use the document id:

```ts
await verify.uniqueColumn(ctx, "users", userId, {
	username: "alice",
});
```

Direct uniqueness verifier calls may use partial data. Only configured unique fields present in the payload are checked.

### Breaking Change

Version `2.0.0` removes the old helper-wrapper API:

- `defaultValuesConfig`
- `protectedColumnsConfig`
- `uniqueRowConfig`
- `uniqueColumnConfig`

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

### Execution Order

Custom extensions always run before built-in uniqueness checks.

- `insert()`: `defaultValues` → custom `extensions` → `uniqueRow` → `uniqueColumn`
- `patch()`: protected-column strip → custom `extensions` → `uniqueRow` → `uniqueColumn` → protected-column strip again
- `dangerouslyPatch()`: custom `extensions` → `uniqueRow` → `uniqueColumn`

`defaultValues` and protected-column stripping are preprocessing steps, not entries in the custom `extensions` array.

### Creating an Extension

Use `createExtension`. For schema-aware typing in the callback, pass the schema as the first argument:

```ts
import { createExtension } from "convex-verify";
import { ConvexError } from "convex/values";

const normalizeEmail = createExtension(schema, (input) => {
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
