import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Test schema with tables and indexes for testing all features.
 * This schema is used by convex-test to mock the database.
 */
export default defineSchema({
	users: defineTable({
		email: v.string(),
		username: v.string(),
		name: v.optional(v.string()),
		status: v.optional(v.string()),
		clerkId: v.optional(v.string()),
	})
		.index("by_email", ["email"])
		.index("by_username", ["username"]),

	posts: defineTable({
		title: v.string(),
		slug: v.string(),
		authorId: v.string(),
		content: v.optional(v.string()),
		status: v.optional(v.string()),
		views: v.optional(v.number()),
	})
		.index("by_slug", ["slug"])
		.index("by_author_slug", ["authorId", "slug"]),

	comments: defineTable({
		postId: v.string(),
		authorId: v.string(),
		body: v.string(),
		likes: v.optional(v.number()),
	}).index("by_post", ["postId"]),
});
