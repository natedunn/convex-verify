import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { insert } from "./verify";
import schema from "./schema";

export const createUser = mutation({
	args: {
		email: v.string(),
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const id = await insert(ctx, "users", args, {
			onFail: () => {
				throw new ConvexError("Failed to insert user");
			},
		});
		return ctx.db.get(id);
	},
});

export const listUsers = query({
	args: {},
	handler: async (ctx) => {
		return ctx.db.query("users").collect();
	},
});
