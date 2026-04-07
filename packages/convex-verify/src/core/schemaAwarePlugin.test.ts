import { convexTest } from "convex-test";
import {
	DataModelFromSchemaDefinition,
	GenericMutationCtx,
} from "convex/server";
import { GenericId } from "convex/values";
import { describe, expect, it } from "vitest";

import schema from "../__tests__/schema";
import { modules } from "../__tests__/modules";
import { createExtension } from "./plugin";
import { verifyConfig } from "./verifyConfig";

describe("schema-aware extensions", () => {
	it("narrows data from tableName and operation", async () => {
		const t = convexTest(schema, modules);

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

		const { insert, patch } = verifyConfig(schema, {
			extensions: [normalizeEmail],
		});

		let userId: GenericId<"users">;
		await t.run(async (ctx) => {
			userId = await insert(ctx, "users", {
				email: " ALICE@EXAMPLE.COM ",
				username: "alice",
			});
		});

		await t.run(async (ctx) => {
			await patch(ctx, "users", userId!, {
				email: " BOB@EXAMPLE.COM ",
			});
		});

		await t.run(async (ctx) => {
			const user = await ctx.db.get(userId!);
			expect(user?.email).toBe("bob@example.com");
		});
	});

	it("supports typed direct verify calls when needed", async () => {
		const t = convexTest(schema, modules);

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

		await t.run(async (ctx) => {
			const inserted = await normalizeEmail.verify({
				ctx,
				tableName: "users",
				operation: "insert",
				schema,
				data: {
					email: " ALICE@EXAMPLE.COM ",
					username: "alice",
				},
			});

			expect(inserted).toEqual({
				email: "alice@example.com",
				username: "alice",
			});

			const patched = await normalizeEmail.verify({
				ctx,
				tableName: "users",
				operation: "patch",
				patchId: "user-id" as GenericId<"users">,
				schema,
				data: {
					email: " BOB@EXAMPLE.COM ",
				},
			});

			expect(patched).toEqual({
				email: "bob@example.com",
			});
		});
	});

	it("supports schema-aware typing from createExtension(schema, fn)", async () => {
		const t = convexTest(schema, modules);

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

		const { insert } = verifyConfig(schema, {
			extensions: [normalizeEmail],
		});

		await t.run(async (ctx) => {
			const userId = await insert(ctx, "users", {
				email: " ALICE@EXAMPLE.COM ",
				username: "alice",
			});

			const user = await ctx.db.get(userId);
			expect(user?.email).toBe("alice@example.com");
		});
	});
});

function assertSchemaAwareExtensionTypes(
	ctx: Omit<
		GenericMutationCtx<DataModelFromSchemaDefinition<typeof schema>>,
		never
	>,
	userId: GenericId<"users">,
) {
	const normalizeEmail = createExtension<typeof schema>((input) => {
		if (input.tableName !== "users") {
			return input.data;
		}

		if (input.operation === "insert") {
			const email: string = input.data.email;

			return {
				...input.data,
				email: email.toLowerCase().trim(),
			};
		}

		const email: string | undefined = input.data.email;

		return {
			...input.data,
			...(email !== undefined && {
				email: email.toLowerCase().trim(),
			}),
		};
	});

	void normalizeEmail.verify({
		ctx,
		tableName: "users",
		operation: "insert",
		schema,
		data: {
			email: "alice@example.com",
			username: "alice",
		},
	});

	void normalizeEmail.verify({
		ctx,
		tableName: "users",
		operation: "patch",
		patchId: userId,
		schema,
		data: {
			email: "bob@example.com",
		},
	});

	void normalizeEmail.verify({
		ctx,
		tableName: "users",
		operation: "insert",
		schema,
		data: {
			// @ts-expect-error wrong users field type
			email: 123,
			username: "alice",
		},
	});

	void normalizeEmail.verify({
		ctx,
		tableName: "posts",
		operation: "insert",
		schema,
		data: {
			// @ts-expect-error wrong table fields
			email: "alice@example.com",
			username: "alice",
		},
	});

	void normalizeEmail.verify({
		ctx,
		tableName: "users",
		operation: "patch",
		patchId: userId,
		schema,
		data: {
			// @ts-expect-error wrong patch field
			slug: "nope",
		},
	});
}
