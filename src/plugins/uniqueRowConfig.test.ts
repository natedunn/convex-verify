import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { verifyConfig } from "../core/verifyConfig";
import { uniqueRowConfig } from "./uniqueRowConfig";
import schema from "../__tests__/schema";
import { modules } from "../__tests__/modules";

describe("uniqueRowConfig", () => {
	describe("insert operations", () => {
		it("allows insert when no duplicate row exists", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueRow: uniqueRowConfig(schema, {
					posts: ["by_author_slug"],
				}),
			});

			await t.run(async (ctx) => {
				const id = await insert(ctx, "posts", {
					title: "My First Post",
					slug: "my-first-post",
					authorId: "author123",
				});
				expect(id).toBeDefined();
			});
		});

		it("allows same slug for different authors", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueRow: uniqueRowConfig(schema, {
					posts: ["by_author_slug"],
				}),
			});

			await t.run(async (ctx) => {
				await insert(ctx, "posts", {
					title: "First Author Post",
					slug: "hello-world",
					authorId: "author1",
				});

				// Same slug, different author - should work
				const id = await insert(ctx, "posts", {
					title: "Second Author Post",
					slug: "hello-world",
					authorId: "author2",
				});
				expect(id).toBeDefined();
			});
		});

		it("throws error when duplicate author+slug combination exists", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueRow: uniqueRowConfig(schema, {
					posts: ["by_author_slug"],
				}),
			});

			await t.run(async (ctx) => {
				await insert(ctx, "posts", {
					title: "Original Post",
					slug: "my-post",
					authorId: "author123",
				});
			});

			// Same author + same slug should fail
			await t.run(async (ctx) => {
				await expect(
					insert(ctx, "posts", {
						title: "Duplicate Post",
						slug: "my-post",
						authorId: "author123",
					})
				).rejects.toThrowError(/existing row/);
			});
		});

		it("allows different slugs for same author", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueRow: uniqueRowConfig(schema, {
					posts: ["by_author_slug"],
				}),
			});

			await t.run(async (ctx) => {
				await insert(ctx, "posts", {
					title: "First Post",
					slug: "first-post",
					authorId: "author123",
				});

				// Same author, different slug - should work
				const id = await insert(ctx, "posts", {
					title: "Second Post",
					slug: "second-post",
					authorId: "author123",
				});
				expect(id).toBeDefined();
			});
		});
	});

	describe("patch operations", () => {
		it("allows patch that does not create duplicate", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch } = verifyConfig(schema, {
				uniqueRow: uniqueRowConfig(schema, {
					posts: ["by_author_slug"],
				}),
			});

			let postId: any;
			await t.run(async (ctx) => {
				postId = await insert(ctx, "posts", {
					title: "My Post",
					slug: "my-post",
					authorId: "author123",
				});
			});

			// Patch title only (doesn't affect uniqueness)
			await t.run(async (ctx) => {
				await expect(
					patch(ctx, "posts", postId, { title: "Updated Title" })
				).resolves.not.toThrow();
			});
		});

		it("allows patch to change slug to unique value", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch } = verifyConfig(schema, {
				uniqueRow: uniqueRowConfig(schema, {
					posts: ["by_author_slug"],
				}),
			});

			let postId: any;
			await t.run(async (ctx) => {
				postId = await insert(ctx, "posts", {
					title: "My Post",
					slug: "old-slug",
					authorId: "author123",
				});
			});

			// Change slug to new unique value
			await t.run(async (ctx) => {
				await expect(
					patch(ctx, "posts", postId, { slug: "new-slug" })
				).resolves.not.toThrow();
			});
		});

		it("throws error when patch would create duplicate row", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch } = verifyConfig(schema, {
				uniqueRow: uniqueRowConfig(schema, {
					posts: ["by_author_slug"],
				}),
			});

			let firstPostId: any;
			await t.run(async (ctx) => {
				firstPostId = await insert(ctx, "posts", {
					title: "First Post",
					slug: "first-post",
					authorId: "author123",
				});
				await insert(ctx, "posts", {
					title: "Second Post",
					slug: "second-post",
					authorId: "author123",
				});
			});

			// Try to change first post's slug to match second post
			await t.run(async (ctx) => {
				await expect(
					patch(ctx, "posts", firstPostId, { slug: "second-post" })
				).rejects.toThrowError(/already exists/);
			});
		});

		it("allows patch with same values on same document", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch } = verifyConfig(schema, {
				uniqueRow: uniqueRowConfig(schema, {
					posts: ["by_author_slug"],
				}),
			});

			let postId: any;
			await t.run(async (ctx) => {
				postId = await insert(ctx, "posts", {
					title: "My Post",
					slug: "my-post",
					authorId: "author123",
				});
			});

			// Patch with same slug value (updating same document)
			await t.run(async (ctx) => {
				await expect(
					patch(ctx, "posts", postId, { slug: "my-post", title: "New Title" })
				).resolves.not.toThrow();
			});
		});
	});

	describe("onFail callback", () => {
		it("calls onFail with existing data details", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueRow: uniqueRowConfig(schema, {
					posts: ["by_author_slug"],
				}),
			});

			await t.run(async (ctx) => {
				await insert(ctx, "posts", {
					title: "Original Post",
					slug: "my-post",
					authorId: "author123",
				});
			});

			let onFailCalled = false;
			let existingData: any = null;

			await t.run(async (ctx) => {
				try {
					await insert(
						ctx,
						"posts",
						{
							title: "Duplicate Post",
							slug: "my-post",
							authorId: "author123",
						},
						{
							onFail: (args) => {
								onFailCalled = true;
								existingData = args.uniqueRow?.existingData;
							},
						}
					);
				} catch {
					// Expected to throw
				}
			});

			expect(onFailCalled).toBe(true);
			expect(existingData).toBeDefined();
			expect(existingData?.slug).toBe("my-post");
			expect(existingData?.authorId).toBe("author123");
		});
	});

	describe("tables without config", () => {
		it("allows operations on tables without uniqueRow config", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				uniqueRow: uniqueRowConfig(schema, {
					posts: ["by_author_slug"],
				}),
			});

			// Users table has no uniqueRow config
			await t.run(async (ctx) => {
				const id1 = await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});
				expect(id1).toBeDefined();

				// Duplicate data allowed since no uniqueRow config
				const id2 = await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
				});
				expect(id2).toBeDefined();
			});
		});
	});
});
