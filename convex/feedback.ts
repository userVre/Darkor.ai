import { mutationGeneric } from "convex/server";
import { v } from "convex/values";

import { resolveViewer } from "./viewer";

export const submit = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    message: v.string(),
    generationCount: v.optional(v.union(v.number(), v.int64())),
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
      kind: "message",
      message: trimmed,
      createdAt: Date.now(),
      generationCount: args.generationCount,
    });

    return { id };
  },
});

export const submitGenerationReview = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    generationId: v.id("generations"),
    sentiment: v.union(v.literal("liked"), v.literal("disliked")),
    styleSelected: v.string(),
    serviceType: v.optional(v.string()),
    roomLabel: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await resolveViewer(ctx, {
      anonymousId: args.anonymousId,
      createGuest: true,
    });
    if (!viewer) {
      throw new Error("Unauthorized");
    }

    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }
    if (generation.userId !== viewer.userId) {
      throw new Error("Forbidden");
    }

    const id = await ctx.db.insert("feedback", {
      userId: viewer.userId,
      kind: "generation_review",
      generationId: args.generationId,
      sentiment: args.sentiment,
      styleSelected: args.styleSelected.trim() || "Custom",
      serviceType: args.serviceType?.trim() || generation.serviceType,
      roomLabel: args.roomLabel?.trim() || generation.roomType,
      source: args.source?.trim() || "workspace_editor",
      createdAt: Date.now(),
      generationCount: undefined,
    });

    return { id };
  },
});
