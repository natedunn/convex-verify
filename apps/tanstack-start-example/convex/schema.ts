import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	users: defineTable({
		email: v.string(),
		name: v.optional(v.string()),
		status: v.string(),
		createdAt: v.number(),
	}).index("by_email", ["email"]),
	defaultProfiles: defineTable({
		label: v.string(),
		status: v.string(),
		createdAt: v.number(),
	}),
	uniqueEmailUsers: defineTable({
		email: v.string(),
		label: v.string(),
	}).index("by_email", ["email"]),
	uniquePairEntries: defineTable({
		title: v.string(),
		slug: v.string(),
		teamSlug: v.string(),
	}).index("by_team_slug", ["teamSlug", "slug"]),
	protectedDocs: defineTable({
		title: v.string(),
		ownerId: v.string(),
		body: v.optional(v.string()),
	}),
});
