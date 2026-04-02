import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  createMutatePlugin,
  defaultValuesConfig,
  uniqueColumnConfig,
  verifyConfig,
} from "convex-verify";
import schema from "./schema";

const normalizeEmail = createMutatePlugin("normalizeEmail", {}, {
  insert: (_context, data) => ({
    ...data,
    email: (data.email as string).toLowerCase().trim(),
  }),
});

const { insert } = verifyConfig(schema, {
  defaultValues: defaultValuesConfig(schema, () => ({
    users: {
      createdAt: Date.now(),
      status: "pending",
    },
  })),
  uniqueColumn: uniqueColumnConfig(schema, {
    users: ["by_email"],
  }),
  plugins: [normalizeEmail],
});

export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
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
