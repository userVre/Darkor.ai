import { mutationGeneric } from "convex/server";
import { v } from "convex/values";

import { resolveViewer } from "./viewer";

export const submit = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    message: v.string(),
    generationCount: v.optional(v.int64()),
  },
  handler: async (ctx, args) => {
    const viewer = await resolveViewer(ctx, {
      anonymousId: args.anonymousId,
      createGuest: true,
    });
    if (!viewer) {
      throw new Error("Unauthorized");
    }

    const trimmed = args.message.trim();
    if (trimmed.length < 3) {
      throw new Error("Please add a bit more detail.");
    }

    const id = await ctx.db.insert("feedback", {
      userId: viewer.userId,
      message: trimmed,
      createdAt: Date.now(),
      generationCount: args.generationCount,
    });

    return { id };
  },
});
