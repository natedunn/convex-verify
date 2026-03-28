import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { verifyConfig } from "./verifyConfig";
import { createMutatePlugin, createValidatePlugin } from "./plugin";
import schema from "../__tests__/schema";
import { modules } from "../__tests__/modules";

describe("plugins can transform data", () => {
	describe("createMutatePlugin – insert", () => {
		it("transforms data before insert", async () => {
			const t = convexTest(schema, modules);

			// Plugin that normalizes email to lowercase
			const normalizeEmail = createMutatePlugin("normalizeEmail", {}, {
				insert: (_context, data) => ({
					...data,
					email: (data.email as string).toLowerCase().trim(),
				}),
			});

			const { insert } = verifyConfig(schema, {
				plugins: [normalizeEmail],
			});

			let insertedId: any;
			await t.run(async (ctx) => {
				insertedId = await insert(ctx, "users", {
					email: "ALICE@EXAMPLE.COM",
					username: "alice",
				});
			});

			await t.run(async (ctx) => {
				const doc = await ctx.db.get(insertedId) as any;
				expect(doc?.email).toBe("alice@example.com");
			});
		});

		it("chains multiple transform plugins in order", async () => {
			const t = convexTest(schema, modules);

			const lowercaseEmail = createMutatePlugin("lowercaseEmail", {}, {
				insert: (_ctx, data) => ({
					...data,
					email: (data.email as string).toLowerCase(),
				}),
			});

			const addDefaultUsername = createMutatePlugin("addDefaultUsername", {}, {
				insert: (_ctx, data) => ({
					...data,
					// Derive username from email when username is empty
					username: (data.username as string).length > 0
						? data.username
						: (data.email as string).split("@")[0],
				}),
			});

			const { insert } = verifyConfig(schema, {
				plugins: [lowercaseEmail, addDefaultUsername],
			});

			let insertedId: any;
			await t.run(async (ctx) => {
				insertedId = await insert(ctx, "users", {
					email: "BOB@EXAMPLE.COM",
					username: "",
				});
			});

			await t.run(async (ctx) => {
				const doc = await ctx.db.get(insertedId) as any;
				// lowercaseEmail runs first, then addDefaultUsername sees lowercased email
				// email.split("@")[0] of "bob@example.com" → "bob"
				expect(doc?.email).toBe("bob@example.com");
				expect(doc?.username).toBe("bob");
			});
		});
	});

	describe("createMutatePlugin – patch", () => {
		it("transforms data before patch", async () => {
			const t = convexTest(schema, modules);

			const normalizeEmail = createMutatePlugin("normalizeEmail", {}, {
				patch: (_context, data) => ({
					...data,
					...(data.email !== undefined && {
						email: (data.email as string).toLowerCase().trim(),
					}),
				}),
			});

			const { insert, patch } = verifyConfig(schema, {
				plugins: [normalizeEmail],
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
				const doc = await ctx.db.get(userId) as any;
				expect(doc?.email).toBe("alice@updated.com");
			});
		});
	});

	describe("createValidatePlugin still works as a transform", () => {
		it("returns modified data from a validate plugin", async () => {
			const t = convexTest(schema, modules);

			// Config captured in closure; plugin verify functions receive ValidateContext (not plugin config)
			const prefix = "post-";
			const addSlugPrefix = createValidatePlugin("addSlugPrefix", {}, {
				insert: (_context, data) => ({
					...data,
					slug: `${prefix}${data.slug}`,
				}),
			});

			const { insert } = verifyConfig(schema, {
				plugins: [addSlugPrefix],
			});

			let postId: any;
			await t.run(async (ctx) => {
				postId = await insert(ctx, "posts", {
					title: "Hello",
					slug: "hello",
					authorId: "author1",
				});
			});

			await t.run(async (ctx) => {
				const doc = await ctx.db.get(postId) as any;
				expect(doc?.slug).toBe("post-hello");
			});
		});
	});

	describe("mixed validation and transformation", () => {
		it("can validate and transform in the same plugin", async () => {
			const t = convexTest(schema, modules);

			// Config captured in closure; plugin verify functions receive ValidateContext (not plugin config)
			const minLength = 3;
			const normalizeAndValidate = createMutatePlugin(
				"normalizeAndValidate",
				{},
				{
					insert: (_context, data) => {
						const normalized = (data.username as string).toLowerCase().trim();
						if (normalized.length < minLength) {
							throw new Error("Username too short");
						}
						return { ...data, username: normalized };
					},
				}
			);

			const { insert } = verifyConfig(schema, {
				plugins: [normalizeAndValidate],
			});

			// Valid username – should be normalized and inserted
			let userId: any;
			await t.run(async (ctx) => {
				userId = await insert(ctx, "users", {
					email: "alice@example.com",
					username: "  Alice  ",
				});
			});

			await t.run(async (ctx) => {
				const doc = await ctx.db.get(userId) as any;
				expect(doc?.username).toBe("alice");
			});

			// Invalid username – should throw
			await t.run(async (ctx) => {
				await expect(
					insert(ctx, "users", {
						email: "b@example.com",
						username: "b",
					})
				).rejects.toThrow("Username too short");
			});
		});
	});

	describe("async transform plugins", () => {
		it("supports async transform plugins", async () => {
			const t = convexTest(schema, modules);

			const asyncTransform = createMutatePlugin("asyncTransform", {}, {
				insert: async (_context, data) => {
					// Simulate an async operation
					await Promise.resolve();
					return {
						...data,
						email: (data.email as string).toLowerCase(),
					};
				},
			});

			const { insert } = verifyConfig(schema, {
				plugins: [asyncTransform],
			});

			let userId: any;
			await t.run(async (ctx) => {
				userId = await insert(ctx, "users", {
					email: "ASYNC@EXAMPLE.COM",
					username: "asyncuser",
				});
			});

			await t.run(async (ctx) => {
				const doc = await ctx.db.get(userId) as any;
				expect(doc?.email).toBe("async@example.com");
			});
		});
	});
});
