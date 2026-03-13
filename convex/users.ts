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
      if (!existing.referralCode || typeof existing.referralCount !== "number") {
        await ctx.db.patch(existing._id, {
          referralCode: existing.referralCode ?? identity.subject,
          referralCount: typeof existing.referralCount === "number" ? existing.referralCount : 0,
        });
      }
      return existing;
    }

    const id = await ctx.db.insert("users", {
      clerkId: identity.subject,
      credits: 3,
      plan: "free",
      generationCount: 0,
      reviewPrompted: false,
      lastReviewPromptAt: 0,
      referralCode: identity.subject,
      referralCount: 0,
      referredBy: undefined,
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

export const setPlanFromRevenueCat = mutationGeneric({
  args: {
    plan: v.string(),
    credits: v.optional(v.int64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!existing) {
      throw new Error("No billing profile found.");
    }

    const nextCredits =
      typeof args.credits === "number" ? Math.max(existing.credits, args.credits) : existing.credits;

    await ctx.db.patch(existing._id, {
      plan: args.plan,
      credits: nextCredits,
    });

    return { ok: true };
  },
});

export const trackGeneration = mutationGeneric({
  args: {
    ignoreCooldown: v.optional(v.boolean()),
  },
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!existing) {
      throw new Error("No billing profile found.");
    }

    const currentCount = typeof existing.generationCount === "number" ? existing.generationCount : 0;
    const nextCount = currentCount + 1;
    await ctx.db.patch(existing._id, {
      generationCount: nextCount,
    });

    const lastPromptAt = typeof existing.lastReviewPromptAt === "number" ? existing.lastReviewPromptAt : 0;
    const cooldownMs = 30 * 24 * 60 * 60 * 1000;
    const cooldownActive = lastPromptAt > 0 && Date.now() - lastPromptAt < cooldownMs;
    const shouldPrompt = args.ignoreCooldown
      ? nextCount >= 2
      : !cooldownActive && (nextCount === 2 || nextCount === 3);

    return { count: nextCount, shouldPrompt };
  },
});

export const markReviewPrompted = mutationGeneric({
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

    if (!existing) {
      throw new Error("No billing profile found.");
    }

    await ctx.db.patch(existing._id, {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const current = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

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

    const referrer = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", normalizedCode))
      .unique();

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
