import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  BillingPlan,
  buildSubscriptionPatch,
  canUserGenerateState,
  deriveSubscriptionState,
  FREE_IMAGE_LIMIT,
  SubscriptionEntitlement,
  SubscriptionType,
  toFiniteNumber,
} from "./subscriptions";
import {
  buildDefaultUserFields,
  ensureGuestUser,
  getUserByAnonymousId,
  getUserByClerkId,
  normalizeAnonymousId,
  resolveViewer,
  toGuestUserId,
  transferOwnedDocuments,
} from "./viewer";

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  const user = await getUserByClerkId(ctx, identity.subject);
  return { identity, user };
}

async function syncDerivedSubscriptionState(ctx: any, user: any, now: number) {
  const state = deriveSubscriptionState(user, now);
  const patch = omitUndefined(state.patch);
  if (Object.keys(patch).length > 0) {
    await ctx.db.patch(user._id, patch);
  }
  return state;
}

function getLimitExceededMessage(state: ReturnType<typeof deriveSubscriptionState>) {
  return state.statusMessage;
}

function computeReviewPrompt(nextCount: number, lastPromptAt: number, ignoreCooldown?: boolean) {
  const cooldownMs = 30 * 24 * 60 * 60 * 1000;
  const cooldownActive = lastPromptAt > 0 && Date.now() - lastPromptAt < cooldownMs;
  return ignoreCooldown ? nextCount >= 2 : !cooldownActive && (nextCount === 2 || nextCount === 3);
}

const THREE_DAY_REWARD_MS = 72 * 60 * 60 * 1000;

function buildViewerResponse(user: any) {
  if (!user) {
    return null;
  }

  const state = deriveSubscriptionState(user, Date.now());
  return {
    ...user,
    credits: state.remaining,
    plan: state.plan,
    subscriptionType: state.subscriptionType,
    subscriptionEntitlement: state.subscriptionEntitlement,
    subscriptionStartedAt: state.subscriptionStartedAt,
    subscriptionEnd: state.subscriptionEnd,
    imageLimit: state.limit,
    imageGenerationCount: state.imageGenerationCount,
    lastResetDate: state.lastResetDate,
    generationResetAt: state.nextResetDate,
    imageGenerationLimit: state.limit,
    imagesRemaining: state.remaining,
    subscriptionActive: state.active,
    generationLimitReached: state.reachedLimit,
    canGenerateNow: !state.blocked,
    generationStatusLabel: state.statusLabel,
    generationStatusMessage: state.statusMessage,
    hasPaidAccess: state.hasPaidAccess,
    canExport4k: state.canExport4k,
    canRemoveWatermark: state.canRemoveWatermark,
    canVirtualStage: state.canVirtualStage,
    canEditDesigns: state.canEditDesigns,
    isGuest: !user.clerkId,
  };
}

async function getOrCreateClerkUser(ctx: any, clerkId: string) {
  const existing = await getUserByClerkId(ctx, clerkId);
  if (existing) {
    const now = Date.now();
      const state = deriveSubscriptionState(existing, now);
      const patch = omitUndefined({
      credits: toFiniteNumber(existing.credits, 3),
        referralCode: existing.referralCode ?? clerkId,
        referralCount: toFiniteNumber(existing.referralCount),
      lastRewardDate: toFiniteNumber(existing.lastRewardDate, now),
        ...state.patch,
      });
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
    }
    return (await ctx.db.get(existing._id)) ?? existing;
  }

  const id = await ctx.db.insert(
    "users",
    buildDefaultUserFields({
      clerkId,
      referralCode: clerkId,
    }),
  );

  const created = await ctx.db.get(id);
  if (!created) {
    throw new Error("Failed to create user");
  }

  return created;
}

async function ensureViewerUser(ctx: any, anonymousId?: string) {
  const viewer = await resolveViewer(ctx, {
    anonymousId,
    createGuest: true,
  });

  if (!viewer) {
    throw new Error("No billing profile found.");
  }

  if (viewer.kind === "account") {
    const user = viewer.user ?? (await getOrCreateClerkUser(ctx, viewer.clerkId));
    return { ...viewer, user };
  }

  const user = viewer.user ?? (await ensureGuestUser(ctx, viewer.anonymousId));
  return { ...viewer, user };
}

async function mergeAnonymousUserIntoClerkUser(ctx: any, clerkId: string, anonymousId?: string | null) {
  const accountUser = await getOrCreateClerkUser(ctx, clerkId);
  const normalizedAnonymousId = normalizeAnonymousId(anonymousId);

  if (!normalizedAnonymousId) {
    return accountUser;
  }

  const guestUser = await getUserByAnonymousId(ctx, normalizedAnonymousId);
  if (!guestUser || guestUser.clerkId) {
    return accountUser;
  }

  const guestOwnerId = toGuestUserId(normalizedAnonymousId);
  const guestCredits = toFiniteNumber(guestUser.credits);
  const guestGenerationCount = toFiniteNumber(guestUser.generationCount);
  const guestImageGenerationCount = toFiniteNumber(guestUser.imageGenerationCount);
  const guestReferralCount = toFiniteNumber(guestUser.referralCount);

  await transferOwnedDocuments(ctx, guestOwnerId, clerkId);

  await ctx.db.patch(accountUser._id, omitUndefined({
    credits: toFiniteNumber(accountUser.credits) + guestCredits,
    generationCount: toFiniteNumber(accountUser.generationCount) + guestGenerationCount,
    imageGenerationCount:
      toFiniteNumber(accountUser.imageGenerationCount) + guestImageGenerationCount,
    referralCount: toFiniteNumber(accountUser.referralCount) + guestReferralCount,
    referredBy: accountUser.referredBy ?? guestUser.referredBy,
    lastRewardDate: Math.max(toFiniteNumber(accountUser.lastRewardDate), toFiniteNumber(guestUser.lastRewardDate)),
    lastReviewPromptAt: Math.max(toFiniteNumber(accountUser.lastReviewPromptAt), toFiniteNumber(guestUser.lastReviewPromptAt)),
  }));

  await ctx.db.patch(guestUser._id, {
    credits: 0,
    generationCount: 0,
    imageGenerationCount: 0,
    reviewPrompted: false,
    mergedIntoClerkId: clerkId,
  });

  return (await ctx.db.get(accountUser._id)) ?? accountUser;
}

export const getOrCreateCurrentUser = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      return await mergeAnonymousUserIntoClerkUser(ctx, identity.subject, args.anonymousId);
    }

    const guestUser = await ensureGuestUser(ctx, args.anonymousId ?? "");
    if (!guestUser) {
      throw new Error("Failed to create guest user");
    }

    return guestUser;
  },
});

export const me = queryGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await resolveViewer(ctx, {
      anonymousId: args.anonymousId,
      createGuest: false,
      requireViewer: false,
    });
    return buildViewerResponse(viewer?.user ?? null);
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

    return await getUserByClerkId(ctx, args.clerkId);
  },
});

async function persistRevenueCatPlanForUser(
  ctx: any,
  user: any,
  args: {
    plan: string;
    subscriptionType?: SubscriptionType;
    subscriptionEntitlement?: SubscriptionEntitlement;
    purchasedAt?: number;
    subscriptionEnd?: number;
  },
) {
  if (!user) {
    throw new Error("No billing profile found.");
  }

  const now = Date.now();
  const purchasedAt = toFiniteNumber(args.purchasedAt, now);
  const nextPlan = args.plan === "trial" || args.plan === "pro" ? (args.plan as BillingPlan) : "free";
  const nextSubscriptionType = (args.subscriptionType ?? (nextPlan === "free" ? "free" : user.subscriptionType ?? "free")) as SubscriptionType;
  const subscriptionPatch = buildSubscriptionPatch({
    plan: nextPlan,
    subscriptionType: nextSubscriptionType,
    subscriptionEntitlement: args.subscriptionEntitlement,
    purchasedAt,
    subscriptionEnd: args.subscriptionEnd,
    previousSubscriptionType: user.subscriptionType,
    previousSubscriptionEntitlement: user.subscriptionEntitlement,
    previousSubscriptionStart: user.subscriptionStartedAt,
  });

  await ctx.db.patch(user._id, omitUndefined({
    plan: subscriptionPatch.plan,
    subscriptionType: subscriptionPatch.subscriptionType,
    subscriptionEntitlement: subscriptionPatch.subscriptionEntitlement,
    subscriptionStartedAt: subscriptionPatch.subscriptionStartedAt,
    subscriptionEnd: subscriptionPatch.subscriptionEnd,
    imageLimit: subscriptionPatch.imageLimit,
    imageGenerationCount: subscriptionPatch.imageGenerationCount,
    lastResetDate: subscriptionPatch.lastResetDate,
  }));

  return subscriptionPatch;
}

export const setPlanFromRevenueCat = mutationGeneric({
  args: {
    plan: v.string(),
    subscriptionType: v.optional(v.union(v.literal("weekly"), v.literal("yearly"), v.literal("free"))),
    subscriptionEntitlement: v.optional(v.union(v.literal("weekly_pro"), v.literal("annual_pro"), v.literal("free"))),
    purchasedAt: v.optional(v.number()),
    subscriptionEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await getCurrentUser(ctx);
    await persistRevenueCatPlanForUser(ctx, user, args);

    return { ok: true, clerkId: identity.subject };
  },
});

export const setViewerPlanFromRevenueCat = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    plan: v.string(),
    subscriptionType: v.optional(v.union(v.literal("weekly"), v.literal("yearly"), v.literal("free"))),
    subscriptionEntitlement: v.optional(v.union(v.literal("weekly_pro"), v.literal("annual_pro"), v.literal("free"))),
    purchasedAt: v.optional(v.number()),
    subscriptionEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    await persistRevenueCatPlanForUser(ctx, viewer.user, args);
    return { ok: true, viewerKind: viewer.kind };
  },
});

export const syncRevenueCatSubscriptionInternal = mutationGeneric({
  args: {
    clerkId: v.string(),
    plan: v.union(v.literal("free"), v.literal("trial"), v.literal("pro")),
    subscriptionType: v.union(v.literal("weekly"), v.literal("yearly"), v.literal("free")),
    subscriptionEntitlement: v.optional(v.union(v.literal("weekly_pro"), v.literal("annual_pro"), v.literal("free"))),
    purchasedAt: v.optional(v.number()),
    subscriptionEnd: v.optional(v.number()),
    internalToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedInternalToken = process.env.CONVEX_INTERNAL_API_TOKEN;
    if (expectedInternalToken && args.internalToken !== expectedInternalToken) {
      throw new ConvexError("Forbidden");
    }

    const now = Date.now();
    const purchasedAt = toFiniteNumber(args.purchasedAt, now);
    const existing = await getUserByClerkId(ctx, args.clerkId);

    if (!existing) {
      const initialSubscription = buildSubscriptionPatch({
        plan: args.plan,
        subscriptionType: args.subscriptionType,
        subscriptionEntitlement: args.subscriptionEntitlement,
        purchasedAt,
        subscriptionEnd: args.subscriptionEnd,
      });

      await ctx.db.insert("users", {
        ...buildDefaultUserFields({
          clerkId: args.clerkId,
          referralCode: args.clerkId,
        }),
        plan: initialSubscription.plan,
        subscriptionType: initialSubscription.subscriptionType,
        subscriptionEntitlement: initialSubscription.subscriptionEntitlement,
        subscriptionStartedAt: initialSubscription.subscriptionStartedAt,
        subscriptionEnd: initialSubscription.subscriptionEnd,
        imageLimit: initialSubscription.imageLimit,
        imageGenerationCount: initialSubscription.imageGenerationCount ?? 0,
        lastResetDate: initialSubscription.lastResetDate ?? 0,
      });
      return { ok: true, created: true };
    }

    const subscriptionPatch = buildSubscriptionPatch({
      plan: args.plan,
      subscriptionType: args.subscriptionType,
      subscriptionEntitlement: args.subscriptionEntitlement,
      purchasedAt,
      subscriptionEnd: args.subscriptionEnd,
      previousSubscriptionType: existing.subscriptionType,
      previousSubscriptionEntitlement: existing.subscriptionEntitlement,
      previousSubscriptionStart: existing.subscriptionStartedAt,
    });

    await ctx.db.patch(existing._id, omitUndefined(subscriptionPatch));
    return { ok: true, created: false };
  },
});

export const getGenerationStatus = queryGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await resolveViewer(ctx, {
      anonymousId: args.anonymousId,
      createGuest: false,
      requireViewer: false,
    });
    return buildViewerResponse(viewer?.user ?? null);
  },
});

export const canUserGenerate = queryGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await resolveViewer(ctx, {
      anonymousId: args.anonymousId,
      createGuest: false,
      requireViewer: false,
    });
    if (!viewer?.user) {
      return {
        allowed: false,
        reason: "paywall" as const,
        shouldTriggerPaywall: true,
        shouldShowLimitReached: false,
        message: "Free limit reached. Upgrade to continue.",
      };
    }

    const state = deriveSubscriptionState(viewer.user, Date.now());
    return canUserGenerateState(state);
  },
});

async function consumeAllowance(ctx: any, anonymousId?: string, ignoreCooldown?: boolean) {
  const viewer = await ensureViewerUser(ctx, anonymousId);
  const user = viewer.user;

  const now = Date.now();
  const state = await syncDerivedSubscriptionState(ctx, user, now);
  if (state.blocked) {
    throw new ConvexError(getLimitExceededMessage(state));
  }

  const currentCount = toFiniteNumber(user.generationCount);
  const nextGenerationCount = currentCount + 1;
  const nextImageGenerationCount = state.subscriptionType === "free" ? state.imageGenerationCount : state.imageGenerationCount + 1;
  const lastPromptAt = toFiniteNumber(user.lastReviewPromptAt);
  const shouldPrompt = computeReviewPrompt(nextGenerationCount, lastPromptAt, ignoreCooldown);

  await ctx.db.patch(user._id, {
    generationCount: nextGenerationCount,
    credits: state.subscriptionType === "free" ? Math.max(state.credits - 1, 0) : state.credits,
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

  const remaining =
    state.subscriptionType === "free" ? Math.max(state.credits - 1, 0) : Math.max(state.limit - nextImageGenerationCount, 0);
  const statusLabel =
    state.subscriptionType === "weekly"
      ? `${remaining} / ${state.limit} images left`
      : state.subscriptionType === "yearly"
        ? `${remaining} / ${state.limit} this month`
        : `${remaining} / ${FREE_IMAGE_LIMIT} gifts left`;

  return {
    count: nextGenerationCount,
    shouldPrompt,
    credits: remaining,
    imageGenerationCount: nextImageGenerationCount,
    imageGenerationLimit: state.limit,
    imagesRemaining: remaining,
    subscriptionType: state.subscriptionType,
    generationStatusLabel: statusLabel,
    generationStatusMessage: remaining <= 0 ? `Limit Reached - ${statusLabel}` : statusLabel,
  };
}

export const consumeGenerationAllowance = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    ignoreCooldown: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await consumeAllowance(ctx, args.anonymousId, args.ignoreCooldown);
  },
});

export const releaseGenerationAllowance = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    const user = viewer.user;

    const state = await syncDerivedSubscriptionState(ctx, user, Date.now());
    const nextImageGenerationCount =
      state.subscriptionType === "free" ? state.imageGenerationCount : Math.max(state.imageGenerationCount - 1, 0);
    const currentCount = toFiniteNumber(user.generationCount);
    const nextGenerationCount = Math.max(currentCount - 1, 0);

  await ctx.db.patch(user._id, {
    credits: state.subscriptionType === "free" ? Math.min(state.credits + 1, FREE_IMAGE_LIMIT) : state.credits,
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

    const remaining =
      state.subscriptionType === "free" ? Math.min(state.credits + 1, FREE_IMAGE_LIMIT) : Math.max(state.limit - nextImageGenerationCount, 0);
    return {
      ok: true,
      credits: remaining,
      imageGenerationCount: nextImageGenerationCount,
      imagesRemaining: remaining,
      generationStatusLabel:
        state.subscriptionType === "weekly"
          ? `${remaining} / ${state.limit} images left`
          : state.subscriptionType === "yearly"
            ? `${remaining} / ${state.limit} this month`
            : `${remaining} / ${FREE_IMAGE_LIMIT} gifts left`,
    };
  },
});

export const trackGeneration = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    ignoreCooldown: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await consumeAllowance(ctx, args.anonymousId, args.ignoreCooldown);
  },
});

export const markReviewPrompted = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    const user = viewer.user;

    await ctx.db.patch(user._id, {
      reviewPrompted: true,
      lastReviewPromptAt: Date.now(),
    });

    return { ok: true };
  },
});

export const applyReferral = mutationGeneric({
  args: {
    referralCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { user: current } = await getCurrentUser(ctx);
    if (!current) {
      throw new Error("No billing profile found.");
    }

    const normalizedCode = args.referralCode.trim();
    if (!normalizedCode) {
      return { ok: false, reason: "invalid_referral" };
    }

    if (current.referredBy) {
      return { ok: false, reason: "already_referred" };
    }

    if (normalizedCode === current.clerkId) {
      return { ok: false, reason: "self_referral" };
    }

    const referrer = await getUserByClerkId(ctx, normalizedCode);
    if (!referrer) {
      return { ok: false, reason: "invalid_referral" };
    }

    const nextReferralCount = (referrer.referralCount ?? 0) + 1;

    await ctx.db.patch(referrer._id, {
      referralCount: nextReferralCount,
    });

    await ctx.db.patch(current._id, {
      referredBy: referrer.clerkId,
    });

    return { ok: true };
  },
});

export const claimThreeDayReward = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    const user = viewer.user;
    const now = Date.now();
    const lastRewardDate = toFiniteNumber(user.lastRewardDate);
    const nextEligibleAt = lastRewardDate > 0 ? lastRewardDate + THREE_DAY_REWARD_MS : now;

    if (user.plan !== "free") {
      return {
        granted: false,
        creditsAdded: 0,
        credits: 0,
        nextEligibleAt,
      };
    }

    if (nextEligibleAt > now) {
      return {
        granted: false,
        creditsAdded: 0,
        credits: Math.min(toFiniteNumber(user.credits, FREE_IMAGE_LIMIT), FREE_IMAGE_LIMIT),
        nextEligibleAt,
      };
    }

    const currentCredits = Math.min(toFiniteNumber(user.credits, FREE_IMAGE_LIMIT), FREE_IMAGE_LIMIT);
    const nextCredits = Math.min(currentCredits + 1, FREE_IMAGE_LIMIT);
    const creditsAdded = Math.max(nextCredits - currentCredits, 0);

    await ctx.db.patch(user._id, {
      credits: nextCredits,
      lastRewardDate: now,
    });

    return {
      granted: creditsAdded > 0,
      creditsAdded,
      credits: nextCredits,
      nextEligibleAt: now + THREE_DAY_REWARD_MS,
    };
  },
});

export const deleteAccountData = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    if (!user || !user.clerkId) {
      return { ok: true };
    }

    const generations = await ctx.db
      .query("generations")
      .withIndex("by_userId", (q: any) => q.eq("userId", user.clerkId))
      .collect();

    for (const generation of generations) {
      if (generation.storageId) {
        await ctx.storage.delete(generation.storageId);
      }
      await ctx.db.delete(generation._id);
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q: any) => q.eq("userId", user.clerkId))
      .collect();

    for (const project of projects) {
      await ctx.db.delete(project._id);
    }

    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_userId", (q: any) => q.eq("userId", user.clerkId))
      .collect();

    for (const item of feedback) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(user._id);
    return { ok: true };
  },
});
