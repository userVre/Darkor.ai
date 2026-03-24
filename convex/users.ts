import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

import { BillingPlan, buildSubscriptionPatch, deriveSubscriptionState, SubscriptionType } from "./subscriptions";

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

async function getUserByClerkId(ctx: any, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", clerkId))
    .unique();
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
  if (!state.active) {
    return "Limit Exceeded - Upgrade or Wait";
  }
  return `Limit Exceeded - ${state.statusLabel}`;
}

function computeReviewPrompt(nextCount: number, lastPromptAt: number, ignoreCooldown?: boolean) {
  const cooldownMs = 30 * 24 * 60 * 60 * 1000;
  const cooldownActive = lastPromptAt > 0 && Date.now() - lastPromptAt < cooldownMs;
  return ignoreCooldown ? nextCount >= 2 : !cooldownActive && (nextCount === 2 || nextCount === 3);
}

export const getOrCreateCurrentUser = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await getUserByClerkId(ctx, identity.subject);
    if (existing) {
      const now = Date.now();
      const state = deriveSubscriptionState(existing, now);
      const patch = omitUndefined({
        credits: typeof existing.credits === "number" ? existing.credits : 3,
        referralCode: existing.referralCode ?? identity.subject,
        referralCount: typeof existing.referralCount === "number" ? existing.referralCount : 0,
        lastRewardDate: typeof existing.lastRewardDate === "number" ? existing.lastRewardDate : now,
        ...state.patch,
      });
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      const refreshed = await ctx.db.get(existing._id);
      return refreshed ?? existing;
    }

    const now = Date.now();
    const id = await ctx.db.insert("users", {
      clerkId: identity.subject,
      credits: 3,
      plan: "free",
      generationCount: 0,
      reviewPrompted: false,
      lastReviewPromptAt: 0,
      lastRewardDate: now,
      referralCode: identity.subject,
      referralCount: 0,
      referredBy: undefined,
      subscriptionType: "free",
      subscriptionEnd: 0,
      imageGenerationCount: 0,
      lastResetDate: 0,
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

    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user) {
      return null;
    }

    const state = deriveSubscriptionState(user, Date.now());
    return {
      ...user,
      plan: state.plan,
      subscriptionType: state.subscriptionType,
      subscriptionEnd: state.subscriptionEnd,
      imageGenerationCount: state.imageGenerationCount,
      lastResetDate: state.lastResetDate,
      imageGenerationLimit: state.limit,
      imagesRemaining: state.remaining,
      subscriptionActive: state.active,
      generationLimitReached: state.reachedLimit,
      generationStatusLabel: state.statusLabel,
      generationStatusMessage: state.statusMessage,
    };
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

export const setPlanFromRevenueCat = mutationGeneric({
  args: {
    plan: v.string(),
    credits: v.optional(v.int64()),
    subscriptionType: v.optional(v.union(v.literal("weekly"), v.literal("yearly"), v.literal("free"))),
    purchasedAt: v.optional(v.int64()),
    subscriptionEnd: v.optional(v.int64()),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("No billing profile found.");
    }

    const now = Date.now();
    const purchasedAt = typeof args.purchasedAt === "number" ? args.purchasedAt : now;
    const nextPlan = args.plan === "trial" || args.plan === "pro" ? (args.plan as BillingPlan) : "free";
    const nextSubscriptionType = (args.subscriptionType ?? (nextPlan === "free" ? "free" : user.subscriptionType ?? "free")) as SubscriptionType;
    const subscriptionPatch = buildSubscriptionPatch({
      plan: nextPlan,
      subscriptionType: nextSubscriptionType,
      purchasedAt,
      subscriptionEnd: args.subscriptionEnd,
      previousSubscriptionType: user.subscriptionType,
      previousSubscriptionEnd: user.subscriptionEnd,
    });

    const nextCredits = typeof args.credits === "number" ? Math.max(user.credits, args.credits) : user.credits;

    await ctx.db.patch(user._id, omitUndefined({
      plan: subscriptionPatch.plan,
      subscriptionType: subscriptionPatch.subscriptionType,
      subscriptionEnd: subscriptionPatch.subscriptionEnd,
      imageGenerationCount: subscriptionPatch.imageGenerationCount,
      lastResetDate: subscriptionPatch.lastResetDate,
      credits: nextCredits,
    }));

    return { ok: true, clerkId: identity.subject };
  },
});

export const syncRevenueCatSubscriptionInternal = mutationGeneric({
  args: {
    clerkId: v.string(),
    plan: v.union(v.literal("free"), v.literal("trial"), v.literal("pro")),
    subscriptionType: v.union(v.literal("weekly"), v.literal("yearly"), v.literal("free")),
    purchasedAt: v.optional(v.int64()),
    subscriptionEnd: v.optional(v.int64()),
    internalToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedInternalToken = process.env.CONVEX_INTERNAL_API_TOKEN;
    if (expectedInternalToken && args.internalToken !== expectedInternalToken) {
      throw new ConvexError("Forbidden");
    }

    const now = Date.now();
    const purchasedAt = typeof args.purchasedAt === "number" ? args.purchasedAt : now;
    const existing = await getUserByClerkId(ctx, args.clerkId);

    if (!existing) {
      const initialSubscription = buildSubscriptionPatch({
        plan: args.plan,
        subscriptionType: args.subscriptionType,
        purchasedAt,
        subscriptionEnd: args.subscriptionEnd,
      });

      await ctx.db.insert("users", {
        clerkId: args.clerkId,
        credits: 3,
        plan: initialSubscription.plan,
        generationCount: 0,
        reviewPrompted: false,
        lastReviewPromptAt: 0,
        lastRewardDate: now,
        referralCode: args.clerkId,
        referralCount: 0,
        referredBy: undefined,
        subscriptionType: initialSubscription.subscriptionType,
        subscriptionEnd: initialSubscription.subscriptionEnd,
        imageGenerationCount: initialSubscription.imageGenerationCount ?? 0,
        lastResetDate: initialSubscription.lastResetDate ?? 0,
      });
      return { ok: true, created: true };
    }

    const subscriptionPatch = buildSubscriptionPatch({
      plan: args.plan,
      subscriptionType: args.subscriptionType,
      purchasedAt,
      subscriptionEnd: args.subscriptionEnd,
      previousSubscriptionType: existing.subscriptionType,
      previousSubscriptionEnd: existing.subscriptionEnd,
    });

    await ctx.db.patch(existing._id, omitUndefined(subscriptionPatch));
    return { ok: true, created: false };
  },
});

export const getGenerationStatus = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user) {
      return null;
    }

    const state = deriveSubscriptionState(user, Date.now());
    return {
      subscriptionType: state.subscriptionType,
      subscriptionEnd: state.subscriptionEnd,
      imageGenerationCount: state.imageGenerationCount,
      imageGenerationLimit: state.limit,
      imagesRemaining: state.remaining,
      subscriptionActive: state.active,
      generationLimitReached: state.reachedLimit,
      generationStatusLabel: state.statusLabel,
      generationStatusMessage: state.statusMessage,
    };
  },
});

async function consumeAllowance(ctx: any, ignoreCooldown?: boolean) {
  const { user } = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("No billing profile found.");
  }

  const now = Date.now();
  const state = await syncDerivedSubscriptionState(ctx, user, now);
  if (state.blocked) {
    throw new ConvexError(getLimitExceededMessage(state));
  }

  const currentCount = typeof user.generationCount === "number" ? user.generationCount : 0;
  const nextGenerationCount = currentCount + 1;
  const nextImageGenerationCount = state.imageGenerationCount + 1;
  const lastPromptAt = typeof user.lastReviewPromptAt === "number" ? user.lastReviewPromptAt : 0;
  const shouldPrompt = computeReviewPrompt(nextGenerationCount, lastPromptAt, ignoreCooldown);

  await ctx.db.patch(user._id, {
    generationCount: nextGenerationCount,
    imageGenerationCount: nextImageGenerationCount,
    lastResetDate: state.subscriptionType === "free" ? 0 : state.lastResetDate,
    ...(state.patch.plan ? { plan: state.patch.plan } : {}),
    ...(state.patch.subscriptionType ? { subscriptionType: state.patch.subscriptionType } : {}),
    ...(typeof state.patch.subscriptionEnd === "number" ? { subscriptionEnd: state.patch.subscriptionEnd } : {}),
  });

  const remaining = Math.max(state.limit - nextImageGenerationCount, 0);
  const statusLabel = state.subscriptionType === "weekly"
    ? `${remaining} / ${state.limit} images left`
    : `${remaining} / ${state.limit} this month`;

  return {
    count: nextGenerationCount,
    shouldPrompt,
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
    ignoreCooldown: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await consumeAllowance(ctx, args.ignoreCooldown);
  },
});

export const releaseGenerationAllowance = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("No billing profile found.");
    }

    const state = await syncDerivedSubscriptionState(ctx, user, Date.now());
    const nextImageGenerationCount = Math.max(state.imageGenerationCount - 1, 0);
    const currentCount = typeof user.generationCount === "number" ? user.generationCount : 0;
    const nextGenerationCount = Math.max(currentCount - 1, 0);

    await ctx.db.patch(user._id, {
      imageGenerationCount: nextImageGenerationCount,
      generationCount: nextGenerationCount,
    });

    const remaining = Math.max(state.limit - nextImageGenerationCount, 0);
    return {
      ok: true,
      imageGenerationCount: nextImageGenerationCount,
      imagesRemaining: remaining,
      generationStatusLabel: state.subscriptionType === "weekly"
        ? `${remaining} / ${state.limit} images left`
        : state.subscriptionType === "yearly"
          ? `${remaining} / ${state.limit} this month`
          : "0 / 0 images left",
    };
  },
});

export const trackGeneration = mutationGeneric({
  args: {
    ignoreCooldown: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await (consumeGenerationAllowance.handler as any)(ctx, args);
  },
});

export const markReviewPrompted = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("No billing profile found.");
    }

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
    const { identity, user: current } = await getCurrentUser(ctx);
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

    const nextCredits = referrer.credits + 3;
    const nextReferralCount = (referrer.referralCount ?? 0) + 1;

    await ctx.db.patch(referrer._id, {
      credits: nextCredits,
      referralCount: nextReferralCount,
    });

    await ctx.db.patch(current._id, {
      referredBy: referrer.clerkId,
    });

    return { ok: true };
  },
});

export const claimThreeDayReward = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("No billing profile found.");
    }

    if (user.plan !== "free") {
      return {
        granted: false,
        creditsAdded: 0,
        credits: user.credits,
        nextEligibleAt: user.lastRewardDate ?? 0,
      };
    }

    const now = Date.now();
    const lastRewardDate = typeof user.lastRewardDate === "number" ? user.lastRewardDate : 0;
    const rewardWindowMs = 72 * 60 * 60 * 1000;
    const nextEligibleAt = lastRewardDate + rewardWindowMs;

    if (now < nextEligibleAt) {
      return {
        granted: false,
        creditsAdded: 0,
        credits: user.credits,
        nextEligibleAt,
      };
    }

    const nextCredits = user.credits + 3;
    await ctx.db.patch(user._id, {
      credits: nextCredits,
      lastRewardDate: now,
    });

    return {
      granted: true,
      creditsAdded: 3,
      credits: nextCredits,
      nextEligibleAt: now + rewardWindowMs,
    };
  },
});

export const deleteAccountData = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    if (!user) {
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


