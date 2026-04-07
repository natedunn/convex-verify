import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { dangerouslyPatch, insert, patch, verify } from "./verify";

export const listDefaultProfiles = query({
	args: {},
	handler: async (ctx) => {
		return ctx.db.query("defaultProfiles").collect();
	},
});

export const createDefaultProfile = mutation({
	args: {
		label: v.string(),
	},
	handler: async (ctx, args) => {
		const id = await insert(ctx, "defaultProfiles", args);
		return ctx.db.get(id);
	},
});

export const previewDefaultProfile = mutation({
	args: {
		label: v.string(),
	},
	handler: async (_ctx, args) => {
		return verify.defaultValues("defaultProfiles", args);
	},
});

export const listUniqueEmailUsers = query({
	args: {},
	handler: async (ctx) => {
		return ctx.db.query("uniqueEmailUsers").collect();
	},
});

export const createUniqueEmailUser = mutation({
	args: {
		email: v.string(),
		label: v.string(),
	},
	handler: async (ctx, args) => {
		const id = await insert(ctx, "uniqueEmailUsers", args);
		return ctx.db.get(id);
	},
});

export const listUniquePairEntries = query({
	args: {},
	handler: async (ctx) => {
		return ctx.db.query("uniquePairEntries").collect();
	},
});

export const createUniquePairEntry = mutation({
	args: {
		title: v.string(),
		slug: v.string(),
		teamSlug: v.string(),
	},
	handler: async (ctx, args) => {
		await verify.uniqueRow(ctx, "uniquePairEntries", args);
		const id = await insert(ctx, "uniquePairEntries", args);
		return ctx.db.get(id);
	},
});

export const listProtectedDocs = query({
	args: {},
	handler: async (ctx) => {
		return ctx.db.query("protectedDocs").collect();
	},
});

export const createProtectedDoc = mutation({
	args: {
		title: v.string(),
		ownerId: v.string(),
		body: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const id = await insert(ctx, "protectedDocs", args);
		return ctx.db.get(id);
	},
});

export const safePatchProtectedDoc = mutation({
	args: {
		id: v.id("protectedDocs"),
		title: v.string(),
		ownerId: v.optional(v.string()),
		body: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const filtered = await verify.protectedColumns("protectedDocs", {
			title: args.title,
			body: args.body,
			...(args.ownerId ? { ownerId: args.ownerId } : {}),
		});

		await patch(ctx, "protectedDocs", args.id, filtered);
		return {
			filtered,
			doc: await ctx.db.get(args.id),
		};
	},
});

export const dangerousPatchProtectedDoc = mutation({
	args: {
		id: v.id("protectedDocs"),
		title: v.string(),
		ownerId: v.optional(v.string()),
		body: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await dangerouslyPatch(ctx, "protectedDocs", args.id, {
			title: args.title,
			body: args.body,
			...(args.ownerId ? { ownerId: args.ownerId } : {}),
		});

		return ctx.db.get(args.id);
	},
});
