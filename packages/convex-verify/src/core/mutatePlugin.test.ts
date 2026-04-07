import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "../__tests__/schema";
import { modules } from "../__tests__/modules";
import { createExtension } from "./plugin";
import { verifyConfig } from "./verifyConfig";

describe("extensions can transform data", () => {
	it("transforms data before insert", async () => {
		const t = convexTest(schema, modules);

		const normalizeEmail = createExtension((input) => {
			const data = input.data as Record<string, any>;
			return {
				...data,
				email: String(data.email).toLowerCase().trim(),
			};
		});

		const { insert } = verifyConfig(schema, {
			extensions: [normalizeEmail],
		});

		let insertedId: any;
		await t.run(async (ctx) => {
			insertedId = await insert(ctx, "users", {
				email: "ALICE@EXAMPLE.COM",
				username: "alice",
			});
		});

		await t.run(async (ctx) => {
			const doc = (await ctx.db.get(insertedId)) as any;
			expect(doc?.email).toBe("alice@example.com");
		});
	});

	it("chains multiple extensions in order", async () => {
		const t = convexTest(schema, modules);

		const lowercaseEmail = createExtension((input) => {
			const data = input.data as Record<string, any>;
			return {
				...data,
				email: String(data.email).toLowerCase(),
			};
		});

		const addDefaultUsername = createExtension((input) => {
			const data = input.data as Record<string, any>;
			return {
				...data,
				username:
					String(data.username).length > 0
						? data.username
						: String(data.email).split("@")[0],
			};
		});

		const { insert } = verifyConfig(schema, {
			extensions: [lowercaseEmail, addDefaultUsername],
		});

		let insertedId: any;
		await t.run(async (ctx) => {
			insertedId = await insert(ctx, "users", {
				email: "BOB@EXAMPLE.COM",
				username: "",
			});
		});

		await t.run(async (ctx) => {
			const doc = (await ctx.db.get(insertedId)) as any;
			expect(doc?.email).toBe("bob@example.com");
			expect(doc?.username).toBe("bob");
		});
	});

	it("transforms data before patch", async () => {
		const t = convexTest(schema, modules);

		const normalizeEmail = createExtension((input) => {
			if (input.operation === "insert") {
				return input.data;
			}

			const data = input.data as Record<string, any>;
			return {
				...data,
				...(data.email !== undefined && {
					email: String(data.email).toLowerCase().trim(),
				}),
			};
		});

		const { insert, patch } = verifyConfig(schema, {
			extensions: [normalizeEmail],
		});

		let userId: any;
		await t.run(async (ctx) => {
			userId = await insert(ctx, "users", {
				email: "alice@example.com",
				username: "alice",
			});
		});

		await t.run(async (ctx) => {
			await patch(ctx, "users", userId, { email: "ALICE@UPDATED.COM" });
		});

		await t.run(async (ctx) => {
			const doc = (await ctx.db.get(userId)) as any;
			expect(doc?.email).toBe("alice@updated.com");
		});
	});

	it("can validate and transform in the same extension", async () => {
		const t = convexTest(schema, modules);

		const normalizeAndValidate = createExtension((input) => {
			const data = input.data as Record<string, any>;
			const normalized = String(data.username).toLowerCase().trim();
			if (normalized.length < 3) {
				throw new Error("Username too short");
			}
			return { ...data, username: normalized };
		});

		const { insert } = verifyConfig(schema, {
			extensions: [normalizeAndValidate],
		});

		let userId: any;
		await t.run(async (ctx) => {
			userId = await insert(ctx, "users", {
				email: "alice@example.com",
				username: "  Alice  ",
			});
		});

		await t.run(async (ctx) => {
			const doc = (await ctx.db.get(userId)) as any;
			expect(doc?.username).toBe("alice");
		});

		await t.run(async (ctx) => {
			await expect(
				insert(ctx, "users", {
					email: "b@example.com",
					username: "b",
				}),
			).rejects.toThrow("Username too short");
		});
	});

	it("supports async extensions", async () => {
		const t = convexTest(schema, modules);

		const asyncTransform = createExtension(async (input) => {
			const data = input.data as Record<string, any>;
			await Promise.resolve();
			return {
				...data,
				email: String(data.email).toLowerCase(),
			};
		});

		const { insert } = verifyConfig(schema, {
			extensions: [asyncTransform],
		});

		let userId: any;
		await t.run(async (ctx) => {
			userId = await insert(ctx, "users", {
				email: "ASYNC@EXAMPLE.COM",
				username: "asyncuser",
			});
		});

		await t.run(async (ctx) => {
			const doc = (await ctx.db.get(userId)) as any;
			expect(doc?.email).toBe("async@example.com");
		});
	});

	it("runs custom extensions before uniqueColumn config", async () => {
		const t = convexTest(schema, modules);

		const normalizeEmail = createExtension((input) => {
			const data = input.data as Record<string, any>;
			return {
				...data,
				email: String(data.email).toLowerCase().trim(),
			};
		});

		const { insert } = verifyConfig(schema, {
			extensions: [normalizeEmail],
			uniqueColumn: {
				users: ["by_email"],
			},
		});

		await t.run(async (ctx) => {
			await insert(ctx, "users", {
				email: "alice@example.com",
				username: "alice",
			});
		});

		await t.run(async (ctx) => {
			await expect(
				insert(ctx, "users", {
					email: " ALICE@EXAMPLE.COM ",
					username: "alice-2",
				}),
			).rejects.toThrow(/already exists/);
		});
	});

	it("runs custom extensions before uniqueRow config", async () => {
		const t = convexTest(schema, modules);

		const normalizeSlug = createExtension((input) => {
			const data = input.data as Record<string, any>;
			return {
				...data,
				slug: String(data.slug).toLowerCase().trim(),
			};
		});

		const { insert } = verifyConfig(schema, {
			extensions: [normalizeSlug],
			uniqueRow: {
				posts: ["by_author_slug"],
			},
		});

		await t.run(async (ctx) => {
			await insert(ctx, "posts", {
				title: "First",
				slug: "hello-world",
				authorId: "author1",
			});
		});

		await t.run(async (ctx) => {
			await expect(
				insert(ctx, "posts", {
					title: "Duplicate",
					slug: " Hello-World ",
					authorId: "author1",
				}),
			).rejects.toThrow(/existing row|already exists/);
		});
	});
});
