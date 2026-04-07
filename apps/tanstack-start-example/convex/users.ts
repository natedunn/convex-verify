import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { insert, patch, verify } from "./verify";

export const createUser = mutation({
	args: {
		email: v.string(),
		name: v.string(),
	},
	handler: async (ctx, args) => {
		await verify.uniqueColumn(ctx, "users", args);

		const id = await insert(ctx, "users", args);
		return ctx.db.get(id);
	},
});

export const listUsers = query({
	args: {},
	handler: async (ctx) => {
		return ctx.db.query("users").collect();
	},
});

export const updateUser = mutation({
	args: {
		id: v.id("users"),
		email: v.optional(v.string()),
		name: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db.get(args.id);
		if (!user) {
			throw new ConvexError("User not found");
		}
		return await patch(ctx, "users", args.id, args);
	},
});
