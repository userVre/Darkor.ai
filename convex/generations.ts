import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

export const getUserArchive = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("generations")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const saveGeneration = mutationGeneric({
  args: {
    imageUrl: v.string(),
    prompt: v.optional(v.string()),
    style: v.optional(v.string()),
    planUsed: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("generations", {
      userId: identity.subject,
      imageUrl: args.imageUrl,
      prompt: args.prompt,
      style: args.style,
      planUsed: args.planUsed,
    });
  },
});

export const deleteGeneration = mutationGeneric({
  args: {
    id: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Generation not found");
    }
    if (item.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(args.id);
    return { ok: true };
  },
});
