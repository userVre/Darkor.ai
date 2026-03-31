import {
  internalMutationGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { buildDesignPrompt as buildAIDesignPrompt, normalizeAspectRatio as normalizeAIAspectRatio } from "./ai";
import { canUserGenerateState, deriveSubscriptionState, FREE_IMAGE_LIMIT, toFiniteNumber } from "./subscriptions";
import {
  buildDefaultUserFields,
  ensureGuestUser,
  getUserByAnonymousId,
  getUserByClerkId,
  resolveViewer,
} from "./viewer";
import { resolveGenerationStatus } from "../lib/generation-status";

type GenerationStatus = "processing" | "ready" | "failed";

type GenerationUser = {
  _id: string;
  clerkId?: string;
  anonymousId?: string;
  mergedIntoClerkId?: string;
  credits: number;
  generationCount: number;
  reviewPrompted: boolean;
  lastReviewPromptAt?: number;
  lastRewardDate?: number;
  referralCode?: string;
  referralCount?: number;
  referredBy?: string;
  plan?: string;
  subscriptionType?: string;
  subscriptionEntitlement?: string;
  subscriptionStartedAt?: number;
  subscriptionEnd?: number;
  imageLimit?: number;
  imageGenerationCount?: number;
  lastResetDate?: number;
};

async function getUserByOwnerId(ctx: any, ownerId: string) {
  if (ownerId.startsWith("guest:")) {
    const anonymousId = ownerId.slice("guest:".length);
    return (await getUserByAnonymousId(ctx, anonymousId)) as GenerationUser | null;
  }

  return (await getUserByClerkId(ctx, ownerId)) as GenerationUser | null;
}

async function ensureGenerationViewer(ctx: any, anonymousId?: string) {
  const viewer = await resolveViewer(ctx, {
    anonymousId,
    createGuest: true,
  });

  if (!viewer) {
    throw new ConvexError("No viewer session found.");
  }

  if (viewer.kind === "account") {
    if (viewer.user) {
      return { ...viewer, user: viewer.user as GenerationUser };
    }

    const insertedId = await ctx.db.insert(
      "users",
      buildDefaultUserFields({
        clerkId: viewer.clerkId,
        referralCode: viewer.clerkId,
      }),
    );
    const insertedUser = await ctx.db.get(insertedId);
    if (!insertedUser) {
      throw new ConvexError("No billing profile found. Please try again.");
    }

    return { ...viewer, user: insertedUser as GenerationUser };
  }

  const guestUser = (viewer.user ?? (await ensureGuestUser(ctx, viewer.anonymousId))) as GenerationUser | null;
  if (!guestUser) {
    throw new ConvexError("Guest profile not found.");
  }

  return { ...viewer, user: guestUser };
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

async function syncDerivedSubscriptionState(ctx: any, user: GenerationUser, now: number) {
  const state = deriveSubscriptionState(user, now);
  const patch = omitUndefined(state.patch);
  if (Object.keys(patch).length > 0) {
    await ctx.db.patch(user._id as any, patch);
  }
  return state;
}

function getLimitExceededMessage(state: ReturnType<typeof deriveSubscriptionState>) {
  const access = canUserGenerateState(state);
  if (access.allowed) {
    return state.statusMessage;
  }
  return access.shouldTriggerPaywall ? "Payment Required" : access.message;
}

function computeReviewPrompt(nextCount: number, lastPromptAt: number, ignoreCooldown?: boolean) {
  const cooldownMs = 30 * 24 * 60 * 60 * 1000;
  const cooldownActive = lastPromptAt > 0 && Date.now() - lastPromptAt < cooldownMs;
  return ignoreCooldown ? nextCount >= 2 : !cooldownActive && (nextCount === 2 || nextCount === 3);
}

async function reserveGenerationAllowance(ctx: any, ownerId: string, ignoreCooldown?: boolean) {
  const user = await getUserByOwnerId(ctx, ownerId);
  if (!user) {
    throw new ConvexError("No billing profile found. Please subscribe to continue.");
  }

  const state = await syncDerivedSubscriptionState(ctx, user, Date.now());
  if (state.blocked) {
    throw new ConvexError(getLimitExceededMessage(state));
  }

  const currentCount = toFiniteNumber(user.generationCount);
  const nextGenerationCount = currentCount + 1;
  const lastPromptAt = toFiniteNumber(user.lastReviewPromptAt);
  const shouldPrompt = computeReviewPrompt(nextGenerationCount, lastPromptAt, ignoreCooldown);
  const nextCredits = state.subscriptionType === "free" ? Math.max(state.credits - 1, 0) : state.credits;
  const nextImageGenerationCount = state.subscriptionType === "free" ? state.imageGenerationCount : state.imageGenerationCount + 1;

  await ctx.db.patch(user._id as any, {
    generationCount: nextGenerationCount,
    credits: nextCredits,
    imageLimit: state.limit,
    imageGenerationCount: nextImageGenerationCount,
    lastResetDate: state.subscriptionType === "free" ? 0 : state.lastResetDate,
    ...(state.patch.plan ? { plan: state.patch.plan } : {}),
    ...(state.patch.subscriptionType ? { subscriptionType: state.patch.subscriptionType } : {}),
    ...(state.patch.subscriptionEntitlement ? { subscriptionEntitlement: state.patch.subscriptionEntitlement } : {}),
    ...(typeof state.patch.subscriptionStartedAt === "number" ? { subscriptionStartedAt: state.patch.subscriptionStartedAt } : {}),
    ...(typeof state.patch.subscriptionEnd === "number" ? { subscriptionEnd: state.patch.subscriptionEnd } : {}),
    ...(typeof state.patch.imageLimit === "number" ? { imageLimit: state.patch.imageLimit } : {}),
    ...(typeof state.patch.lastResetDate === "number" ? { lastResetDate: state.patch.lastResetDate } : {}),
  });

  return {
    count: nextGenerationCount,
    shouldPrompt,
    creditsRemaining: state.subscriptionType === "free"
      ? nextCredits
      : Math.max(state.limit - nextImageGenerationCount, 0),
    planUsed: state.plan,
  };
}

async function releaseGenerationAllowance(ctx: any, ownerId: string) {
  const user = await getUserByOwnerId(ctx, ownerId);
  if (!user) {
    return {
      ok: false,
      generationCount: 0,
      credits: 0,
    };
  }

  const state = await syncDerivedSubscriptionState(ctx, user, Date.now());
  const currentCount = toFiniteNumber(user.generationCount);
  const nextGenerationCount = Math.max(currentCount - 1, 0);
  const nextCredits = state.subscriptionType === "free" ? Math.min(state.credits + 1, FREE_IMAGE_LIMIT) : state.credits;
  const nextImageGenerationCount = state.subscriptionType === "free" ? state.imageGenerationCount : Math.max(state.imageGenerationCount - 1, 0);

  await ctx.db.patch(user._id as any, {
    credits: nextCredits,
    imageLimit: state.limit,
    imageGenerationCount: nextImageGenerationCount,
    generationCount: nextGenerationCount,
    ...(state.patch.plan ? { plan: state.patch.plan } : {}),
    ...(state.patch.subscriptionType ? { subscriptionType: state.patch.subscriptionType } : {}),
    ...(state.patch.subscriptionEntitlement ? { subscriptionEntitlement: state.patch.subscriptionEntitlement } : {}),
    ...(typeof state.patch.subscriptionStartedAt === "number" ? { subscriptionStartedAt: state.patch.subscriptionStartedAt } : {}),
    ...(typeof state.patch.subscriptionEnd === "number" ? { subscriptionEnd: state.patch.subscriptionEnd } : {}),
    ...(typeof state.patch.imageLimit === "number" ? { imageLimit: state.patch.imageLimit } : {}),
    ...(typeof state.patch.lastResetDate === "number" ? { lastResetDate: state.patch.lastResetDate } : {}),
  });

  return {
    ok: true,
    generationCount: nextGenerationCount,
    credits: state.subscriptionType === "free"
      ? nextCredits
      : Math.max(state.limit - nextImageGenerationCount, 0),
  };
}

function trimOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function resolveRowStatus(row: { status?: string; imageUrl?: string | null }, imageUrl: string): GenerationStatus {
  return resolveGenerationStatus(row.status, imageUrl);
}

export const getUserArchive = queryGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await resolveViewer(ctx, {
      anonymousId: args.anonymousId,
      createGuest: false,
      requireViewer: false,
    });
    if (!viewer) {
      return [];
    }

    const rows = await ctx.db
      .query("generations")
      .withIndex("by_userId", (q) => q.eq("userId", viewer.userId))
      .order("desc")
      .collect();

    return await Promise.all(
      rows.map(async (row) => {
        const generatedStorageUrl = row.storageId ? await ctx.storage.getUrl(row.storageId) : null;
        const sourceImageUrl = row.sourceImageStorageId ? await ctx.storage.getUrl(row.sourceImageStorageId) : null;
        const imageUrl = generatedStorageUrl ?? row.imageUrl ?? "";
        return {
          ...row,
          imageUrl,
          sourceImageUrl,
          status: resolveRowStatus(row, imageUrl),
          isFavorite: row.isFavorite ?? false,
          errorMessage: row.errorMessage ?? null,
        };
      }),
    );
  },
});

export const createSourceUploadUrl = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureGenerationViewer(ctx, args.anonymousId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const startGeneration = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    imageStorageId: v.id("_storage"),
    maskStorageId: v.optional(v.id("_storage")),
    serviceType: v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign")),
    selection: v.string(),
    roomType: v.string(),
    displayStyle: v.optional(v.string()),
    customPrompt: v.optional(v.string()),
    targetColor: v.optional(v.string()),
    targetColorHex: v.optional(v.string()),
    targetColorCategory: v.optional(v.string()),
    targetSurface: v.optional(v.string()),
    aspectRatio: v.string(),
    regenerate: v.optional(v.boolean()),
    ignoreReviewCooldown: v.optional(v.boolean()),
    speedTier: v.optional(v.union(v.literal("standard"), v.literal("pro"), v.literal("ultra"))),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureGenerationViewer(ctx, args.anonymousId);

    const sourceMetadata = await ctx.db.system.get("_storage", args.imageStorageId);
    if (!sourceMetadata) {
      throw new ConvexError("The selected source image is no longer available. Please upload it again.");
    }
    if (args.maskStorageId) {
      const maskMetadata = await ctx.db.system.get("_storage", args.maskStorageId);
      if (!maskMetadata) {
        throw new ConvexError("The selected mask is no longer available. Please paint the walls again.");
      }
    }

    const allowance = await reserveGenerationAllowance(ctx, viewer.userId, args.ignoreReviewCooldown);
    const normalizedSelection = trimOptional(args.selection) ?? "Premium";
    const normalizedAspectRatio = normalizeAIAspectRatio(args.aspectRatio);
    const resolvedStyle =
      trimOptional(args.displayStyle) ??
      (args.serviceType === "paint"
        ? `${normalizedSelection} Paint`
        : args.serviceType === "floor"
          ? `${normalizedSelection} Floor`
          : normalizedSelection);
    const prompt = buildAIDesignPrompt({
      serviceType: args.serviceType,
      roomType: args.roomType,
      style: resolvedStyle,
      customPrompt: args.customPrompt,
      aspectRatio: normalizedAspectRatio,
      colorPalette: normalizedSelection,
      regenerate: args.regenerate,
    });

    const generationId = await ctx.db.insert("generations", {
      userId: viewer.userId,
      sourceImageStorageId: args.imageStorageId,
      maskImageStorageId: args.maskStorageId,
      storageId: undefined,
      imageUrl: undefined,
      prompt,
      style: resolvedStyle,
      roomType: args.roomType,
      customPrompt: trimOptional(args.customPrompt),
      colorPalette: normalizedSelection,
      aspectRatio: normalizedAspectRatio,
      mode:
        args.serviceType === "paint"
          ? "Smart Wall Paint"
          : args.serviceType === "floor"
            ? "Floor Restyle"
            : "Complete Redesign",
      speedTier: args.speedTier ?? "standard",
      status: "processing",
      errorMessage: undefined,
      planUsed: allowance.planUsed,
      createdAt: Date.now(),
      completedAt: undefined,
      isFavorite: false,
      feedback: undefined,
      feedbackReason: undefined,
      retryGranted: false,
      projectId: undefined,
    });

    await ctx.scheduler.runAfter(0, (internal as any).ai.generateDesign, {
      generationId,
      ownerId: viewer.userId,
      imageStorageId: args.imageStorageId,
      maskStorageId: args.maskStorageId,
      serviceType: args.serviceType,
      roomType: args.roomType,
      style: resolvedStyle,
      colorPalette: normalizedSelection,
      customPrompt: trimOptional(args.customPrompt),
      targetColor: trimOptional(args.targetColor),
      targetColorHex: trimOptional(args.targetColorHex),
      targetColorCategory: trimOptional(args.targetColorCategory),
      targetSurface: trimOptional(args.targetSurface),
      aspectRatio: normalizedAspectRatio,
      regenerate: args.regenerate,
      speedTier: args.speedTier ?? "standard",
    });

    return {
      generationId,
      prompt,
      reviewState: {
        count: allowance.count,
        shouldPrompt: allowance.shouldPrompt,
      },
      creditsRemaining: allowance.creditsRemaining,
      planUsed: allowance.planUsed,
    };
  },
});

export const markGenerationFailed = internalMutationGeneric({
  args: {
    generationId: v.id("generations"),
    ownerId: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      return { ok: true, skipped: true };
    }

    if (generation.status !== "processing") {
      return { ok: true, skipped: true };
    }

    await ctx.db.patch(args.generationId, {
      status: "failed",
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });

    await releaseGenerationAllowance(ctx, args.ownerId);
    return { ok: true };
  },
});

export const cancelGeneration = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    id: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureGenerationViewer(ctx, args.anonymousId);
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Generation not found");
    }
    if (item.userId !== viewer.userId) {
      throw new Error("Forbidden");
    }
    if (item.status !== "processing") {
      return { ok: true, cancelled: false };
    }

    await ctx.db.patch(args.id, {
      status: "failed",
      errorMessage: "Cancelled by user.",
      completedAt: Date.now(),
    });
    await releaseGenerationAllowance(ctx, viewer.userId);
    return { ok: true, cancelled: true };
  },
});

export const submitFeedback = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    id: v.id("generations"),
    sentiment: v.union(v.literal("liked"), v.literal("disliked")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureGenerationViewer(ctx, args.anonymousId);

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Generation not found");
    }
    if (item.userId !== viewer.userId) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.id, {
      feedback: args.sentiment,
      feedbackReason: args.reason?.trim() || item.feedbackReason,
      retryGranted: item.retryGranted ?? false,
    });

    return { ok: true, retryGranted: false };
  },
});

export const toggleFavorite = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    id: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureGenerationViewer(ctx, args.anonymousId);

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Generation not found");
    }
    if (item.userId !== viewer.userId) {
      throw new Error("Forbidden");
    }

    const nextValue = !(item.isFavorite ?? false);
    await ctx.db.patch(args.id, { isFavorite: nextValue });
    return { ok: true, isFavorite: nextValue };
  },
});

export const setProject = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    id: v.id("generations"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureGenerationViewer(ctx, args.anonymousId);

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Generation not found");
    }
    if (item.userId !== viewer.userId) {
      throw new Error("Forbidden");
    }

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== viewer.userId) {
        throw new Error("Invalid project");
      }
    }

    await ctx.db.patch(args.id, { projectId: args.projectId ?? undefined });
    return { ok: true };
  },
});

export const deleteGeneration = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    id: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureGenerationViewer(ctx, args.anonymousId);

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Generation not found");
    }
    if (item.userId !== viewer.userId) {
      throw new Error("Forbidden");
    }

    if (item.storageId) {
      await ctx.storage.delete(item.storageId);
    }
    if (item.maskImageStorageId) {
      await ctx.storage.delete(item.maskImageStorageId);
    }
    if (item.sourceImageStorageId) {
      await ctx.storage.delete(item.sourceImageStorageId);
    }

    await ctx.db.delete(args.id);
    return { ok: true };
  },
});
