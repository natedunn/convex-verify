import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { verifyConfig } from "../core/verifyConfig";
import { protectedColumnsConfig } from "./protectedColumnsConfig";
import schema from "../__tests__/schema";
import { modules } from "../__tests__/modules";

describe("protectedColumnsConfig", () => {
	describe("patch operations", () => {
		it("allows patching non-protected columns", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch } = verifyConfig(schema, {
				protectedColumns: protectedColumnsConfig(schema, {
					posts: ["authorId"],
				}),
			});

			let postId: any;
			await t.run(async (ctx) => {
				postId = await insert(ctx, "posts", {
					title: "Original Title",
					slug: "original-slug",
					authorId: "author123",
				});
			});

			// Title and slug are not protected, should work
			await t.run(async (ctx) => {
				await patch(ctx, "posts", postId, {
					title: "Updated Title",
					slug: "updated-slug",
				});

				const post = await ctx.db.get(postId);
				expect(post?.title).toBe("Updated Title");
				expect(post?.slug).toBe("updated-slug");
			});
		});

		// Note: TypeScript prevents passing protected columns at compile time.
		// This test verifies the runtime behavior still works for non-protected fields.
		it("works with mixed updates on non-protected fields", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch } = verifyConfig(schema, {
				protectedColumns: protectedColumnsConfig(schema, {
					posts: ["authorId", "slug"],
				}),
			});

			let postId: any;
			await t.run(async (ctx) => {
				postId = await insert(ctx, "posts", {
					title: "Original",
					slug: "original",
					authorId: "author123",
					status: "draft",
				});
			});

			// Only title and status are patchable
			await t.run(async (ctx) => {
				await patch(ctx, "posts", postId, {
					title: "New Title",
					status: "published",
				});

				const post = await ctx.db.get(postId);
				expect(post?.title).toBe("New Title");
				expect(post?.status).toBe("published");
				// Protected columns unchanged
				expect(post?.slug).toBe("original");
				expect(post?.authorId).toBe("author123");
			});
		});
	});

	describe("dangerouslyPatch", () => {
		it("allows patching protected columns", async () => {
			const t = convexTest(schema, modules);

			const { insert, dangerouslyPatch } = verifyConfig(schema, {
				protectedColumns: protectedColumnsConfig(schema, {
					posts: ["authorId"],
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

			// dangerouslyPatch bypasses protection
			await t.run(async (ctx) => {
				await dangerouslyPatch(ctx, "posts", postId, {
					authorId: "newAuthor456",
				});

				const post = await ctx.db.get(postId);
				expect(post?.authorId).toBe("newAuthor456");
			});
		});

		it("allows patching multiple protected columns at once", async () => {
			const t = convexTest(schema, modules);

			const { insert, dangerouslyPatch } = verifyConfig(schema, {
				protectedColumns: protectedColumnsConfig(schema, {
					posts: ["authorId", "slug"],
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

			await t.run(async (ctx) => {
				await dangerouslyPatch(ctx, "posts", postId, {
					authorId: "newAuthor456",
					slug: "new-slug",
					title: "Also Updated",
				});

				const post = await ctx.db.get(postId);
				expect(post?.authorId).toBe("newAuthor456");
				expect(post?.slug).toBe("new-slug");
				expect(post?.title).toBe("Also Updated");
			});
		});
	});

	describe("insert operations", () => {
		it("protectedColumns does not affect insert", async () => {
			const t = convexTest(schema, modules);

			const { insert } = verifyConfig(schema, {
				protectedColumns: protectedColumnsConfig(schema, {
					posts: ["authorId"],
				}),
			});

			// All columns including authorId can be set on insert
			await t.run(async (ctx) => {
				const id = await insert(ctx, "posts", {
					title: "My Post",
					slug: "my-post",
					authorId: "author123",
				});

				const post = await ctx.db.get(id);
				expect(post?.authorId).toBe("author123");
			});
		});
	});

	describe("tables without config", () => {
		it("allows all columns to be patched on unconfigured tables", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch } = verifyConfig(schema, {
				protectedColumns: protectedColumnsConfig(schema, {
					posts: ["authorId"],
				}),
			});

			// Users table has no protected columns
			let userId: any;
			await t.run(async (ctx) => {
				userId = await insert(ctx, "users", {
					email: "alice@example.com",
					username: "alice",
					name: "Alice",
				});
			});

			// All columns can be patched
			await t.run(async (ctx) => {
				await patch(ctx, "users", userId, {
					email: "newalice@example.com",
					username: "newalice",
					name: "New Alice",
				});

				const user = await ctx.db.get(userId);
				expect(user?.email).toBe("newalice@example.com");
				expect(user?.username).toBe("newalice");
				expect(user?.name).toBe("New Alice");
			});
		});
	});

	describe("multiple tables", () => {
		it("applies different protected columns to different tables", async () => {
			const t = convexTest(schema, modules);

			const { insert, patch, dangerouslyPatch } = verifyConfig(schema, {
				protectedColumns: protectedColumnsConfig(schema, {
					posts: ["authorId"],
					comments: ["postId", "authorId"],
				}),
			});

			let postId: any;
			let commentId: any;

			await t.run(async (ctx) => {
				postId = await insert(ctx, "posts", {
					title: "Test Post",
					slug: "test-post",
					authorId: "author1",
				});

				commentId = await insert(ctx, "comments", {
					postId: "post123",
					authorId: "commenter1",
					body: "Great post!",
				});
			});

			// Patch non-protected on posts
			await t.run(async (ctx) => {
				await patch(ctx, "posts", postId, { title: "Updated Post" });
				const post = await ctx.db.get(postId);
				expect(post?.title).toBe("Updated Post");
			});

			// Patch non-protected on comments (only body is not protected)
			await t.run(async (ctx) => {
				await patch(ctx, "comments", commentId, { body: "Updated comment!" });
				const comment = await ctx.db.get(commentId);
				expect(comment?.body).toBe("Updated comment!");
			});

			// dangerouslyPatch can update protected on both
			await t.run(async (ctx) => {
				await dangerouslyPatch(ctx, "posts", postId, { authorId: "author2" });
				await dangerouslyPatch(ctx, "comments", commentId, {
					postId: "post456",
					authorId: "commenter2",
				});

				const post = await ctx.db.get(postId);
				expect(post?.authorId).toBe("author2");

				const comment = await ctx.db.get(commentId);
				expect(comment?.postId).toBe("post456");
				expect(comment?.authorId).toBe("commenter2");
			});
		});
	});
});
