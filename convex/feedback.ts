import { mutationGeneric } from "convex/server";
import { v } from "convex/values";

export const submit = mutationGeneric({
  args: {
    message: v.string(),
    generationCount: v.optional(v.int64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const trimmed = args.message.trim();
    if (trimmed.length < 3) {
      throw new Error("Please add a bit more detail.");
    }

    const id = await ctx.db.insert("feedback", {
      userId: identity.subject,
      message: trimmed,
      createdAt: Date.now(),
      generationCount: args.generationCount,
    });

    return { id };
  },
});
