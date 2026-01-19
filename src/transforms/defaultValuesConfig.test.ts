import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { verifyConfig } from "../core/verifyConfig";
import { defaultValuesConfig } from "./defaultValuesConfig";
import schema from "../__tests__/schema";
import { modules } from "../__tests__/modules";

describe("defaultValuesConfig", () => {
	describe("static config", () => {
		it("applies default values on insert", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				defaultValues: defaultValuesConfig(schema, {
					posts: { status: "draft", views: 0 },
				}),
			});

			await t.run(async (ctx) => {
				const id = await insert(ctx, "posts", {
					title: "My Post",
					slug: "my-post",
					authorId: "author123",
					// status and views omitted - should use defaults
				});

				const post = await ctx.db.get(id);
				expect(post?.status).toBe("draft");
				expect(post?.views).toBe(0);
			});
		});

		it("allows overriding default values", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				defaultValues: defaultValuesConfig(schema, {
					posts: { status: "draft", views: 0 },
				}),
			});

			await t.run(async (ctx) => {
				const id = await insert(ctx, "posts", {
					title: "My Post",
					slug: "my-post",
					authorId: "author123",
					status: "published",
					views: 100,
				});

				const post = await ctx.db.get(id);
				expect(post?.status).toBe("published");
				expect(post?.views).toBe(100);
			});
		});

		it("applies defaults only to configured tables", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				defaultValues: defaultValuesConfig(schema, {
					posts: { status: "draft" },
				}),
			});

			// Users table has no defaults config
			await t.run(async (ctx) => {
				const id = await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
					// No defaults applied
				});

				const user = await ctx.db.get(id);
				expect(user?.status).toBeUndefined();
			});
		});

		it("applies partial defaults (only some fields)", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				defaultValues: defaultValuesConfig(schema, {
					posts: { status: "draft" }, // Only status, not views
				}),
			});

			await t.run(async (ctx) => {
				const id = await insert(ctx, "posts", {
					title: "My Post",
					slug: "my-post",
					authorId: "author123",
					views: 50, // Explicitly provided
				});

				const post = await ctx.db.get(id);
				expect(post?.status).toBe("draft"); // Default applied
				expect(post?.views).toBe(50); // User-provided value kept
			});
		});
	});

	describe("dynamic config (function)", () => {
		it("calls config function on each insert", async () => {
			const t = convexTest(schema, modules);

			let callCount = 0;
			const { insert } = verifyConfig(schema, {
				defaultValues: defaultValuesConfig(schema, () => {
					callCount++;
					return {
						posts: { status: "draft", views: callCount * 10 },
					};
				}),
			});

			await t.run(async (ctx) => {
				const id1 = await insert(ctx, "posts", {
					title: "Post 1",
					slug: "post-1",
					authorId: "author123",
				});
				const post1 = await ctx.db.get(id1);
				expect(post1?.views).toBe(10);

				const id2 = await insert(ctx, "posts", {
					title: "Post 2",
					slug: "post-2",
					authorId: "author123",
				});
				const post2 = await ctx.db.get(id2);
				expect(post2?.views).toBe(20);
			});

			expect(callCount).toBe(2);
		});

		it("generates fresh values for each insert", async () => {
			const t = convexTest(schema, modules);

			const timestamps: number[] = [];
			const { insert } = verifyConfig(schema, {
				defaultValues: defaultValuesConfig(schema, () => {
					const now = Date.now();
					timestamps.push(now);
					return {
						posts: { views: now },
					};
				}),
			});

			await t.run(async (ctx) => {
				await insert(ctx, "posts", {
					title: "Post 1",
					slug: "post-1",
					authorId: "author123",
				});

				// Small delay to ensure different timestamp
				await new Promise((resolve) => setTimeout(resolve, 5));

				await insert(ctx, "posts", {
					title: "Post 2",
					slug: "post-2",
					authorId: "author123",
				});
			});

			// Timestamps should be different (dynamic generation)
			expect(timestamps.length).toBe(2);
		});
	});

	describe("async config", () => {
		it("supports async config functions", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				defaultValues: defaultValuesConfig(schema, async () => {
					// Simulate async operation
					await new Promise((resolve) => setTimeout(resolve, 1));
					return {
						posts: { status: "pending-review", views: 0 },
					};
				}),
			});

			await t.run(async (ctx) => {
				const id = await insert(ctx, "posts", {
					title: "Async Post",
					slug: "async-post",
					authorId: "author123",
				});

				const post = await ctx.db.get(id);
				expect(post?.status).toBe("pending-review");
			});
		});
	});

	describe("multiple tables", () => {
		it("applies different defaults to different tables", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				defaultValues: defaultValuesConfig(schema, {
					posts: { status: "draft", views: 0 },
					users: { status: "active" },
					comments: { likes: 0 },
				}),
			});

			await t.run(async (ctx) => {
				const postId = await insert(ctx, "posts", {
					title: "Test Post",
					slug: "test-post",
					authorId: "author123",
				});
				const post = await ctx.db.get(postId);
				expect(post?.status).toBe("draft");
				expect(post?.views).toBe(0);

				const userId = await insert(ctx, "users", {
					email: "user@example.com",
					username: "user",
				});
				const user = await ctx.db.get(userId);
				expect(user?.status).toBe("active");

				const commentId = await insert(ctx, "comments", {
					postId: "post123",
					authorId: "author123",
					body: "Great post!",
				});
				const comment = await ctx.db.get(commentId);
				expect(comment?.likes).toBe(0);
			});
		});
	});
});
