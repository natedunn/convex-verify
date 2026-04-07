import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import type { DataModelForSchema, UniqueColumnConfigData } from "../core/types";
import { verifyConfig } from "../core/verifyConfig";
import schema from "../__tests__/schema";
import { modules } from "../__tests__/modules";

describe("uniqueColumnConfig", () => {
	describe("insert operations", () => {
		it("allows insert when no duplicate exists", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueColumn: {
					users: ["by_email"],
				},
			});

			await t.run(async (ctx) => {
				const id = await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});
				expect(id).toBeDefined();
			});
		});

		it("supports direct verifier calls with partial data", async () => {
			const t = convexTest(schema, modules);

			const { insert, verify } = verifyConfig(schema, {
				uniqueColumn: {
					users: ["by_email", "by_username"],
				},
			});

			await t.run(async (ctx) => {
				await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});

				const checked = await verify.uniqueColumn(ctx, "users", {
					email: "bob@example.com",
				});

				expect(checked).toEqual({
					email: "bob@example.com",
				});
			});
		});

		it("throws error when duplicate email exists on insert", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueColumn: {
					users: ["by_email"],
				},
			});

			// Insert first user
			await t.run(async (ctx) => {
				await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});
			});

			// Try to insert duplicate
			await t.run(async (ctx) => {
				await expect(
					insert(ctx, "users", {
						email: "alice@example.com",
						username: "alice2",
					})
				).rejects.toThrowError(/already exists/);
			});
		});

		it("allows insert with different email values", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueColumn: {
					users: ["by_email"],
				},
			});

			await t.run(async (ctx) => {
				await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});

				// Different email should work
				const id = await insert(ctx, "users", {
					email: "bob@example.com",
					username: "bob",
				});
				expect(id).toBeDefined();
			});
		});

		it("validates multiple unique columns", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueColumn: {
					users: ["by_email", "by_username"],
				},
			});

			await t.run(async (ctx) => {
				await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});
			});

			// Same email should fail
			await t.run(async (ctx) => {
				await expect(
					insert(ctx, "users", {
						email: "alice@example.com",
						username: "different",
					})
				).rejects.toThrowError(/already exists/);
			});

			// Same username should also fail
			await t.run(async (ctx) => {
				await expect(
					insert(ctx, "users", {
						email: "different@example.com",
						username: "alice",
					})
				).rejects.toThrowError(/already exists/);
			});
		});
	});

	describe("patch operations", () => {
		it("allows patch when updating same document with same value", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch } = verifyConfig(schema, {
				uniqueColumn: {
					users: ["by_email"],
				},
			});

			let userId: any;
			await t.run(async (ctx) => {
				userId = await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});
			});

			// Patch same user with same email (should work)
			await t.run(async (ctx) => {
				await expect(
					patch(ctx, "users", userId, { email: "alice@example.com" })
				).resolves.not.toThrow();
			});
		});

		it("allows patch to change email to new unique value", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch } = verifyConfig(schema, {
				uniqueColumn: {
					users: ["by_email"],
				},
			});

			let userId: any;
			await t.run(async (ctx) => {
				userId = await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});
			});

			// Change to new email should work
			await t.run(async (ctx) => {
				await expect(
					patch(ctx, "users", userId, { email: "newalice@example.com" })
				).resolves.not.toThrow();
			});
		});

		it("throws error when patching to existing email of another user", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch } = verifyConfig(schema, {
				uniqueColumn: {
					users: ["by_email"],
				},
			});

			let aliceId: any;
			await t.run(async (ctx) => {
				aliceId = await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});
				await insert(ctx, "users", {
					email: "bob@example.com",
					username: "bob",
				});
			});

			// Try to change Alice's email to Bob's email
			await t.run(async (ctx) => {
				await expect(
					patch(ctx, "users", aliceId, { email: "bob@example.com" })
				).rejects.toThrowError(/already exists/);
			});
		});
	});

	describe("onFail callback", () => {
		it("calls onFail with conflict details", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
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

			let onFailCalled = false;
			let conflictData: any = null;

			await t.run(async (ctx) => {
				try {
					await insert(
						ctx,
						"users",
						{
							email: "alice@example.com",
							username: "alice2",
						},
						{
							onFail: (args) => {
								onFailCalled = true;
								conflictData = args.uniqueColumn;
							},
						}
					);
				} catch {
					// Expected to throw
				}
			});

			expect(onFailCalled).toBe(true);
			expect(conflictData).toBeDefined();
			expect(conflictData?.conflictingColumn).toBe("email");
		});
	});

	describe("tables without config", () => {
		it("allows operations on tables without unique column config", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueColumn: {
					users: ["by_email"],
				},
			});

			// Posts table has no uniqueColumn config, should work freely
			await t.run(async (ctx) => {
				const id = await insert(ctx, "posts", {
					title: "Test Post",
					slug: "test-post",
					authorId: "author123",
				});
				expect(id).toBeDefined();

				// Duplicate slug should be allowed since no config
				const id2 = await insert(ctx, "posts", {
					title: "Another Post",
					slug: "test-post", // Same slug
					authorId: "author123",
				});
				expect(id2).toBeDefined();
			});
		});
	});

	describe("returned verify and config", () => {
		it("exposes verify.uniqueColumn and raw config.uniqueColumn", async () => {
			const t = convexTest(schema, modules);

			const uniqueColumn: UniqueColumnConfigData<DataModelForSchema<typeof schema>> = {
				users: ["by_email"],
			};

			const { insert, verify, config } = verifyConfig(schema, {
				uniqueColumn,
			});

			expect(config.uniqueColumn).toBe(uniqueColumn);

			let userId: any;
			await t.run(async (ctx) => {
				userId = await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});

				const inserted = await verify.uniqueColumn(ctx, "users", {
					email: "bob@example.com",
					username: "bob",
				});

				expect(inserted.email).toBe("bob@example.com");

				const patched = await verify.uniqueColumn(ctx, "users", userId, {
					username: "alice",
				});

				expect(patched).toEqual({
					username: "alice",
				});
			});
		});
	});
});
