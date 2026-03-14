import { actionGeneric, mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

function decodeBase64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const getUserArchive = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const rows = await ctx.db
      .query("generations")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    const hydrated = await Promise.all(
      rows.map(async (row) => {
        const storageUrl = row.storageId ? await ctx.storage.getUrl(row.storageId) : null;
        return {
          ...row,
          imageUrl: storageUrl ?? row.imageUrl ?? "",
          isFavorite: row.isFavorite ?? false,
        };
      }),
    );

    return hydrated.filter((row) => row.imageUrl.length > 0);
  },
});

export const finalizeStoredGeneration = mutationGeneric({
  args: {
    clerkId: v.string(),
    storageId: v.id("_storage"),
    prompt: v.optional(v.string()),
    style: v.optional(v.string()),
    internalToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedInternalToken = process.env.CONVEX_INTERNAL_API_TOKEN;
    if (expectedInternalToken && args.internalToken !== expectedInternalToken) {
      throw new ConvexError("Forbidden");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new ConvexError("No billing profile found. Please subscribe to continue.");
    }

    if (user.credits <= 0) {
      throw new ConvexError("No credits left. Please refill credits.");
    }

    const nextCredits = user.credits - 1;
    await ctx.db.patch(user._id, {
      credits: nextCredits,
    });

    const generationId = await ctx.db.insert("generations", {
      userId: args.clerkId,
      storageId: args.storageId,
      imageUrl: undefined,
      prompt: args.prompt,
      style: args.style,
      planUsed: user.plan,
      createdAt: Date.now(),
      isFavorite: false,
      feedback: undefined,
      feedbackReason: undefined,
      retryGranted: false,
      projectId: undefined,
    });

    return {
      generationId,
      remainingCredits: nextCredits,
      planUsed: user.plan,
    };
  },
});

export const storeGeneratedFromApi = actionGeneric({
  args: {
    clerkId: v.string(),
    imageBase64: v.string(),
    mimeType: v.optional(v.string()),
    prompt: v.optional(v.string()),
    style: v.optional(v.string()),
    internalToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedInternalToken = process.env.CONVEX_INTERNAL_API_TOKEN;
    if (expectedInternalToken && args.internalToken !== expectedInternalToken) {
      throw new ConvexError("Forbidden");
    }

    const bytes = decodeBase64ToBytes(args.imageBase64);
    const imageBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([imageBuffer], { type: args.mimeType ?? "image/png" });
    const storageId = await ctx.storage.store(blob);

    try {
      const runMutation = ctx.runMutation as unknown as (name: string, args: Record<string, unknown>) => Promise<unknown>;
      const finalized = (await runMutation("generations:finalizeStoredGeneration", {
        clerkId: args.clerkId,
        storageId,
        prompt: args.prompt,
        style: args.style,
        internalToken: args.internalToken,
      })) as { generationId: string; remainingCredits: number; planUsed: string };

      const imageUrl = await ctx.storage.getUrl(storageId);
      if (!imageUrl) {
        throw new ConvexError("Could not generate storage URL");
      }

      return {
        generationId: finalized.generationId,
        storageId,
        imageUrl,
        remainingCredits: finalized.remainingCredits,
        planUsed: finalized.planUsed,
      };
    } catch (error) {
      await ctx.storage.delete(storageId);
      throw error;
    }
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

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("No billing profile found. Please subscribe to continue.");
    }

    if (user.credits <= 0) {
      throw new Error("No credits left. Please refill to continue.");
    }

    await ctx.db.patch(user._id, {
      credits: user.credits - 1,
    });

    return await ctx.db.insert("generations", {
      userId: identity.subject,
      imageUrl: args.imageUrl,
      prompt: args.prompt,
      style: args.style,
      planUsed: user.plan !== "free" ? user.plan : args.planUsed,
      createdAt: Date.now(),
      isFavorite: false,
      feedback: undefined,
      feedbackReason: undefined,
      retryGranted: false,
      projectId: undefined,
    });
  },
});

export const submitFeedback = mutationGeneric({
  args: {
    id: v.id("generations"),
    sentiment: v.union(v.literal("liked"), v.literal("disliked")),
    reason: v.optional(v.string()),
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

    let retryGranted = false;
    if (args.sentiment === "disliked" && !item.retryGranted) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique();
      if (user) {
        await ctx.db.patch(user._id, { credits: user.credits + 1 });
        retryGranted = true;
      }
    }

    await ctx.db.patch(args.id, {
      feedback: args.sentiment,
      feedbackReason: args.reason?.trim() || item.feedbackReason,
      retryGranted: item.retryGranted || retryGranted,
    });

    return { ok: true, retryGranted };
  },
});

export const toggleFavorite = mutationGeneric({
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

    const nextValue = !(item.isFavorite ?? false);
    await ctx.db.patch(args.id, { isFavorite: nextValue });
    return { ok: true, isFavorite: nextValue };
  },
});

export const setProject = mutationGeneric({
  args: {
    id: v.id("generations"),
    projectId: v.optional(v.id("projects")),
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

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== identity.subject) {
        throw new Error("Invalid project");
      }
    }

    await ctx.db.patch(args.id, { projectId: args.projectId ?? undefined });
    return { ok: true };
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

    if (item.storageId) {
      await ctx.storage.delete(item.storageId);
    }

    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

