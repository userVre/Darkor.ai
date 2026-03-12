import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

export const getOrCreateCurrentUser = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      return existing;
    }

    const id = await ctx.db.insert("users", {
      clerkId: identity.subject,
      credits: 3,
      plan: "free",
    });

    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error("Failed to create user");
    }

    return created;
  },
});

export const me = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const getByClerkIdInternal = queryGeneric({
  args: {
    clerkId: v.string(),
    internalToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedInternalToken = process.env.CONVEX_INTERNAL_API_TOKEN;
    if (expectedInternalToken && args.internalToken !== expectedInternalToken) {
      throw new ConvexError("Forbidden");
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const applyPolarCredits = mutationGeneric({
  args: {
    clerkId: v.string(),
    plan: v.string(),
    credits: v.int64(),
    polarCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        credits: existing.credits + args.credits,
        plan: args.plan,
        polarCustomerId: args.polarCustomerId ?? existing.polarCustomerId,
      });
      return { ok: true, userId: existing._id };
    }

    const id = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      credits: args.credits,
      plan: args.plan,
      polarCustomerId: args.polarCustomerId,
    });

    return { ok: true, userId: id };
  },
});

export const addCreditsOnly = mutationGeneric({
  args: {
    clerkId: v.string(),
    credits: v.int64(),
    polarCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        credits: existing.credits + args.credits,
        polarCustomerId: args.polarCustomerId ?? existing.polarCustomerId,
      });
      return { ok: true, userId: existing._id };
    }

    const id = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      credits: args.credits,
      plan: "free",
      polarCustomerId: args.polarCustomerId,
    });

    return { ok: true, userId: id };
  },
});
