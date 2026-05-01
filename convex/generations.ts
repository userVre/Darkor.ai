import {
  internalMutationGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { buildDesignPrompt as buildAIDesignPrompt, normalizeAspectRatio as normalizeAIAspectRatio } from "../lib/design-prompt-builder";
import {
  canUserGenerateState,
  deriveSubscriptionState,
  FREE_REFILL_INTERVAL_MS,
  resolveGenerationPolicy,
  toFiniteNumber,
} from "./subscriptions";
import {
  buildDefaultUserFields,
  ensureGuestUser,
  getUserByAnonymousId,
  getUserByClerkId,
  resolveViewer,
} from "./viewer";
import { resolveGenerationStatus } from "../lib/generation-status";

type GenerationStatus = "processing" | "ready" | "failed";
type CanonicalServiceType = "paint" | "floor" | "redesign" | "layout" | "replace";
type RequestedServiceType = CanonicalServiceType | "wall" | "transfer" | "reference";
type StoredServiceType = CanonicalServiceType | "reference";

type GenerationUser = {
  _id: string;
  clerkId?: string;
  anonymousId?: string;
  mergedIntoClerkId?: string;
  credits: number;
  premiumCredits?: number;
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
  streakCount?: number;
  lastLoginDate?: number;
  lastClaimDate?: number;
  nextDiamondClaimAt?: number;
  canClaimDiamond?: boolean;
  eliteProUntil?: number;
};

const PRO_TOOL_LOCK_MESSAGE = "This tool is reserved for PRO members or Day 7 Streak winners.";

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

function isRestrictedServiceType(serviceType: RequestedServiceType | StoredServiceType) {
  return serviceType === "layout" || serviceType === "replace" || serviceType === "reference";
}

async function reserveGenerationAllowance(
  ctx: any,
  ownerId: string,
  requestedServiceType: RequestedServiceType | StoredServiceType,
  ignoreCooldown?: boolean,
) {
  const user = await getUserByOwnerId(ctx, ownerId);
  if (!user) {
    throw new ConvexError("No billing profile found. Please subscribe to continue.");
  }

  const state = await syncDerivedSubscriptionState(ctx, user, Date.now());
  if (isRestrictedServiceType(requestedServiceType) && !state.hasProAccess) {
    throw new ConvexError(PRO_TOOL_LOCK_MESSAGE);
  }
  if (state.blocked) {
    throw new ConvexError(getLimitExceededMessage(state));
  }

  const processingGenerations = state.subscriptionType === "free"
    ? await ctx.db
        .query("generations")
        .withIndex("by_userId", (q: any) => q.eq("userId", ownerId))
        .collect()
    : [];
  const pendingFreeGenerationCount = state.subscriptionType === "free"
    ? processingGenerations.filter((generation: any) => generation.status === "processing").length
    : 0;
  if (state.subscriptionType === "free" && pendingFreeGenerationCount >= state.credits) {
    throw new ConvexError(getLimitExceededMessage({
      ...state,
      blocked: true,
      reachedLimit: true,
      remaining: 0,
    }));
  }

  const currentCount = toFiniteNumber(user.generationCount);
  const nextGenerationCount = currentCount + 1;
  const lastPromptAt = toFiniteNumber(user.lastReviewPromptAt);
  const shouldPrompt = computeReviewPrompt(nextGenerationCount, lastPromptAt, ignoreCooldown);
  const nextImageGenerationCount = state.subscriptionType === "free" ? state.imageGenerationCount : state.imageGenerationCount + 1;
  const pendingPremiumGenerationCount = state.subscriptionType === "free"
    ? processingGenerations.filter((generation: any) => generation.status === "processing" && generation.qualityTier === "premium").length
    : 0;
  const usesPremiumDiamond =
    state.subscriptionType === "free"
    && state.premiumCredits > pendingPremiumGenerationCount;

  await ctx.db.patch(user._id as any, {
    generationCount: nextGenerationCount,
    credits: state.credits,
    imageLimit: state.limit,
    imageGenerationCount: nextImageGenerationCount,
    lastResetDate: state.lastResetDate,
    ...(state.patch.plan ? { plan: state.patch.plan } : {}),
    ...(state.patch.subscriptionType ? { subscriptionType: state.patch.subscriptionType } : {}),
    ...(state.patch.subscriptionEntitlement ? { subscriptionEntitlement: state.patch.subscriptionEntitlement } : {}),
    ...(typeof state.patch.subscriptionStartedAt === "number" ? { subscriptionStartedAt: state.patch.subscriptionStartedAt } : {}),
    ...(typeof state.patch.subscriptionEnd === "number" ? { subscriptionEnd: state.patch.subscriptionEnd } : {}),
    ...(typeof state.patch.imageLimit === "number" ? { imageLimit: state.patch.imageLimit } : {}),
    ...(typeof state.patch.lastResetDate === "number" ? { lastResetDate: state.patch.lastResetDate } : {}),
  });

  const generationPolicy = resolveGenerationPolicy({
    plan: state.plan,
    hasPaidAccess: state.hasPaidAccess,
    hasProAccess: state.hasProAccess,
    subscriptionType: state.subscriptionType,
    usesPremiumDiamond,
  });

  return {
    count: nextGenerationCount,
    shouldPrompt,
    creditsRemaining: state.subscriptionType === "free"
      ? state.credits
      : Math.max(state.limit - nextImageGenerationCount, 0),
    planUsed: usesPremiumDiamond ? "diamond" : state.plan,
    generationPolicy,
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
  const nextCredits = state.credits;
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
      ? state.credits
      : Math.max(state.limit - nextImageGenerationCount, 0),
  };
}

async function finalizeGenerationAllowance(ctx: any, ownerId: string, generationId?: string) {
  const user = await getUserByOwnerId(ctx, ownerId);
  if (!user) {
    return {
      ok: false,
      credits: 0,
    };
  }

  const state = await syncDerivedSubscriptionState(ctx, user, Date.now());
  if (state.subscriptionType !== "free") {
    return {
      ok: true,
      credits: Math.max(state.limit - state.imageGenerationCount, 0),
    };
  }

  const now = Date.now();
  const nextCredits = Math.max(state.credits - 1, 0);
  const generation = generationId ? await ctx.db.get(generationId as any) : null;
  const usedPremiumDiamond = generation?.qualityTier === "premium";
  const nextPremiumCredits = usedPremiumDiamond ? Math.max(state.premiumCredits - 1, 0) : state.premiumCredits;
  const nextDiamondClaimAt = nextCredits <= 0 ? now + FREE_REFILL_INTERVAL_MS : 0;
  await ctx.db.patch(user._id as any, {
    credits: nextCredits,
    premiumCredits: nextPremiumCredits,
    imageLimit: state.limit,
    lastResetDate: now,
    nextDiamondClaimAt,
    canClaimDiamond: false,
    ...(state.patch.plan ? { plan: state.patch.plan } : {}),
    ...(state.patch.subscriptionType ? { subscriptionType: state.patch.subscriptionType } : {}),
    ...(state.patch.subscriptionEntitlement ? { subscriptionEntitlement: state.patch.subscriptionEntitlement } : {}),
    ...(typeof state.patch.subscriptionStartedAt === "number" ? { subscriptionStartedAt: state.patch.subscriptionStartedAt } : {}),
    ...(typeof state.patch.subscriptionEnd === "number" ? { subscriptionEnd: state.patch.subscriptionEnd } : {}),
    ...(typeof state.patch.imageLimit === "number" ? { imageLimit: state.patch.imageLimit } : {}),
  });

  return {
    ok: true,
    credits: nextCredits,
    premiumCredits: nextPremiumCredits,
  };
}

function trimOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeGenerationSchedulerError(message?: string | null) {
  const raw = trimOptional(message) ?? "Generation failed.";
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("azure_openai_api_key") ||
    normalized.includes("azure_openai_endpoint") ||
    normalized.includes("azure_openai_deployment_name")
  ) {
    return "AI service configuration is unavailable right now. Please try again shortly.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("401")) {
    return "Azure OpenAI authentication failed. Please verify the API key.";
  }

  if (normalized.includes("not found") || normalized.includes("404")) {
    return "Azure OpenAI deployment was not found. Please verify the deployment name and endpoint.";
  }

  return raw;
}

function validateAzureGenerationEnv() {
  const endpoint = trimOptional(process.env.AZURE_OPENAI_ENDPOINT);
  const deploymentName = trimOptional(process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
  const apiKey = trimOptional(process.env.AZURE_OPENAI_API_KEY);

  if (!endpoint || !deploymentName || !apiKey) {
    throw new ConvexError("Missing Azure Environment Variables in Convex Dashboard");
  }

  return {
    endpoint,
    deploymentName,
    apiKey,
    requestUrl: `${endpoint.endsWith("/") ? endpoint : `${endpoint}/`}openai/deployments/${deploymentName}/images/generations?api-version=2025-04-01-preview`,
  };
}

function resolveRowStatus(row: { status?: string; imageUrl?: string | null }, imageUrl: string): GenerationStatus {
  return resolveGenerationStatus(row.status, imageUrl);
}

function canonicalizeServiceType(serviceType: RequestedServiceType): CanonicalServiceType {
  if (serviceType === "wall") {
    return "paint";
  }

  if (serviceType === "transfer" || serviceType === "reference") {
    return "redesign";
  }

  return serviceType;
}

function inferRequestedServiceType(args: {
  serviceType: RequestedServiceType;
  displayStyle?: string;
  referenceImageStorageIds?: unknown[];
  maskStorageId?: unknown;
}) {
  if (args.serviceType !== "redesign") {
    return args.serviceType;
  }

  const displayStyle = trimOptional(args.displayStyle)?.toLowerCase() ?? "";
  if (displayStyle.includes("reference") && (args.referenceImageStorageIds?.length ?? 0) > 0) {
    return "reference";
  }

  if (displayStyle.includes("object replacement") && args.maskStorageId) {
    return "replace";
  }

  return args.serviceType;
}

function resolveStoredServiceType(
  requestedServiceType: RequestedServiceType,
  canonicalServiceType: CanonicalServiceType,
): StoredServiceType {
  return requestedServiceType === "reference" ? "reference" : canonicalServiceType;
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
          watermarkRequired: row.watermarkRequired ?? false,
          serviceType: row.serviceType ?? undefined,
          modeId: row.modeId ?? undefined,
          paletteId: row.paletteId ?? undefined,
          finishId: row.finishId ?? undefined,
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
    referenceImageStorageIds: v.optional(v.array(v.id("_storage"))),
    maskStorageId: v.optional(v.id("_storage")),
    serviceType: v.union(
      v.literal("paint"),
      v.literal("floor"),
      v.literal("redesign"),
      v.literal("layout"),
      v.literal("replace"),
      v.literal("wall"),
      v.literal("transfer"),
      v.literal("reference"),
    ),
    selection: v.string(),
    styleSelections: v.optional(v.array(v.string())),
    roomType: v.string(),
    displayStyle: v.optional(v.string()),
    customPrompt: v.optional(v.string()),
    targetColor: v.optional(v.string()),
    targetColorHex: v.optional(v.string()),
    targetColorCategory: v.optional(v.string()),
    targetSurface: v.optional(v.string()),
    aspectRatio: v.string(),
    modeId: v.optional(v.string()),
    paletteId: v.optional(v.string()),
    finishId: v.optional(v.string()),
    aiSuggestedStyle: v.optional(v.string()),
    aiSuggestedPaletteId: v.optional(v.string()),
    smartSuggest: v.optional(v.boolean()),
    regenerate: v.optional(v.boolean()),
    ignoreReviewCooldown: v.optional(v.boolean()),
    speedTier: v.optional(v.union(v.literal("standard"), v.literal("pro"), v.literal("ultra"))),
  },
  handler: async (ctx, args) => {
    const azureConfig = validateAzureGenerationEnv();
    const requestedServiceType = inferRequestedServiceType(args as typeof args & { serviceType: RequestedServiceType });
    const canonicalServiceType = canonicalizeServiceType(requestedServiceType);
    const storedServiceType = resolveStoredServiceType(requestedServiceType, canonicalServiceType);
    console.log("startGeneration: received request", {
      azureRequestUrl: azureConfig.requestUrl,
      anonymousIdPresent: Boolean(args.anonymousId),
      hasMask: Boolean(args.maskStorageId),
      hasReferenceImages: Boolean(args.referenceImageStorageIds?.length),
      roomType: args.roomType,
      selection: args.selection,
      requestedServiceType,
      serviceType: canonicalServiceType,
      speedTier: args.speedTier ?? "standard",
    });
    console.log("startGeneration: incoming payload debug", {
      keys: Object.keys(args).sort(),
      imageStorageIdPresent: Boolean(args.imageStorageId),
      referenceImageStorageIdCount: args.referenceImageStorageIds?.length ?? 0,
      maskStorageIdPresent: Boolean(args.maskStorageId),
      requestedServiceType,
      canonicalServiceType,
      storedServiceType,
    });
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
    for (const referenceStorageId of args.referenceImageStorageIds ?? []) {
      const referenceMetadata = await ctx.db.system.get("_storage", referenceStorageId);
      if (!referenceMetadata) {
        throw new ConvexError("One of the reference images is no longer available. Please reselect your photos.");
      }
    }

    const allowance = await reserveGenerationAllowance(ctx, viewer.userId, requestedServiceType, args.ignoreReviewCooldown);
    const enforcedGenerationPolicy = allowance.generationPolicy;
    const watermarkRequired = enforcedGenerationPolicy.watermarkRequired;
    const normalizedSelection = trimOptional(args.selection) ?? "Premium";
    const normalizedAspectRatio = normalizeAIAspectRatio(args.aspectRatio);
    const resolvedStyle =
      trimOptional(args.displayStyle) ??
      (canonicalServiceType === "paint"
        ? `${normalizedSelection} Paint`
        : canonicalServiceType === "floor"
          ? `${normalizedSelection} Floor`
          : canonicalServiceType === "layout"
            ? `${normalizedSelection} Layout`
            : canonicalServiceType === "replace"
              ? `${normalizedSelection} Replace`
          : normalizedSelection);
    const prompt = buildAIDesignPrompt({
      serviceType: canonicalServiceType,
      roomType: args.roomType,
      style: resolvedStyle,
      customPrompt: args.customPrompt,
      targetColor: trimOptional(args.targetColor),
      targetColorCategory: trimOptional(args.targetColorCategory),
      targetSurface: trimOptional(args.targetSurface),
      aspectRatio: normalizedAspectRatio,
      colorPalette: normalizedSelection,
      regenerate: args.regenerate,
    });

    const generationId = await ctx.db.insert("generations", {
      userId: viewer.userId,
      sourceImageStorageId: args.imageStorageId,
      referenceImageStorageIds: args.referenceImageStorageIds,
      maskImageStorageId: args.maskStorageId,
      storageId: undefined,
      imageUrl: undefined,
      watermarkRequired,
      prompt,
      style: resolvedStyle,
      styleSelections: args.styleSelections?.filter(Boolean),
      roomType: args.roomType,
      customPrompt: trimOptional(args.customPrompt),
      colorPalette: normalizedSelection,
      aspectRatio: normalizedAspectRatio,
      serviceType: storedServiceType,
      modeId: trimOptional(args.modeId),
      paletteId: trimOptional(args.paletteId),
      finishId: trimOptional(args.finishId),
      aiSuggestedStyle: trimOptional(args.aiSuggestedStyle),
      aiSuggestedPaletteId: trimOptional(args.aiSuggestedPaletteId),
      smartSuggest: args.smartSuggest === true,
      mode:
        canonicalServiceType === "paint"
          ? "Smart Wall Paint"
          : canonicalServiceType === "floor"
            ? "Floor Restyle"
            : canonicalServiceType === "layout"
              ? "Spatial Optimization"
              : canonicalServiceType === "replace"
                ? "Replace Objects"
              : "Complete Redesign",
      qualityTier: enforcedGenerationPolicy.qualityTier,
      outputResolution: enforcedGenerationPolicy.outputResolution,
      speedTier: enforcedGenerationPolicy.speedTier,
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

    console.log("startGeneration: scheduling generateDesign", {
      generationId,
      ownerId: viewer.userId,
      planUsed: allowance.planUsed,
      requestedServiceType,
      serviceType: canonicalServiceType,
    });
    try {
      await ctx.scheduler.runAfter(0, (internal as any).aiNode.generateDesign, {
        generationId,
        ownerId: viewer.userId,
        imageStorageId: args.imageStorageId,
        referenceImageStorageIds: args.referenceImageStorageIds,
        maskStorageId: args.maskStorageId,
        requestedServiceType,
        serviceType: canonicalServiceType,
        roomType: args.roomType,
        style: resolvedStyle,
        styleSelections: args.styleSelections?.filter(Boolean),
        colorPalette: normalizedSelection,
        customPrompt: trimOptional(args.customPrompt),
        targetColor: trimOptional(args.targetColor),
        targetColorHex: trimOptional(args.targetColorHex),
        targetColorCategory: trimOptional(args.targetColorCategory),
        targetSurface: trimOptional(args.targetSurface),
        aspectRatio: normalizedAspectRatio,
        modeId: trimOptional(args.modeId),
        regenerate: args.regenerate,
        aiSuggestedStyle: trimOptional(args.aiSuggestedStyle),
        aiSuggestedPaletteId: trimOptional(args.aiSuggestedPaletteId),
        smartSuggest: args.smartSuggest === true,
        qualityTier: enforcedGenerationPolicy.qualityTier,
        outputResolution: enforcedGenerationPolicy.outputResolution,
        speedTier: enforcedGenerationPolicy.speedTier,
        planUsed: allowance.planUsed,
      });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Failed to schedule Azure image generation.";
      console.error("startGeneration: failed to schedule generateDesign", {
        generationId,
        message: rawMessage,
        requestedServiceType,
        serviceType: canonicalServiceType,
      });
      await ctx.db.patch(generationId, {
        status: "failed",
        errorMessage: rawMessage,
        completedAt: Date.now(),
      });
      await releaseGenerationAllowance(ctx, viewer.userId);
      throw new ConvexError(normalizeGenerationSchedulerError(rawMessage));
    }

    console.log("startGeneration: scheduled successfully", {
      generationId,
      requestedServiceType,
      serviceType: canonicalServiceType,
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
      generationPolicy: allowance.generationPolicy,
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

export const finalizeGenerationSuccess = internalMutationGeneric({
  args: {
    ownerId: v.string(),
    generationId: v.optional(v.id("generations")),
  },
  handler: async (ctx, args) => {
    return await finalizeGenerationAllowance(ctx, args.ownerId, args.generationId);
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
    for (const referenceStorageId of item.referenceImageStorageIds ?? []) {
      await ctx.storage.delete(referenceStorageId);
    }

    await ctx.db.delete(args.id);
    return { ok: true };
  },
});
