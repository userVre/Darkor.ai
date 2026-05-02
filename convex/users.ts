import { internalMutationGeneric, mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  BillingPlan,
  buildSubscriptionPatch,
  canUserGenerateState,
  deriveSubscriptionState,
  ELITE_PASS_GRACE_MS,
  ELITE_PASS_MILESTONE_DAY,
  ELITE_PASS_PRO_MS,
  ELITE_PASS_REWARD_DIAMONDS,
  FREE_DAILY_DIAMOND_CAP,
  FREE_IMAGE_LIMIT,
  FREE_REFILL_INTERVAL_MS,
  INITIAL_FREE_DIAMONDS,
  SubscriptionEntitlement,
  SubscriptionType,
  toFiniteNumber,
} from "./subscriptions";
import {
  buildDefaultUserFields,
  createReferralCode,
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

async function syncDailyStreakState(ctx: any, user: any, now: number) {
  const currentStreak = Math.max(toFiniteNumber(user?.streakCount, 1), 1);
  const lastLoginDate = toFiniteNumber(user?.lastLoginDate);
  const lastClaimAt = getLastClaimAt(user);
  const nextStreakCount = resolveDisplayStreakCount(currentStreak, lastClaimAt, now);
  const canClaimDiamond = resolveClaimFlag(user, now);
  const nextEliteProUntil = Math.max(toFiniteNumber(user?.eliteProUntil), 0);
  const normalizedEliteProUntil = nextEliteProUntil > 0 && nextEliteProUntil <= now ? 0 : nextEliteProUntil;
  const nextProTrialExpiresAt = Math.max(toFiniteNumber(user?.proTrialExpiresAt), 0);
  const normalizedProTrialExpiresAt = nextProTrialExpiresAt > 0 && nextProTrialExpiresAt <= now ? null : nextProTrialExpiresAt || null;
  const hasActivePaidSubscription =
    (user?.subscriptionType === "weekly" || user?.subscriptionType === "yearly")
    && toFiniteNumber(user?.subscriptionEnd) > now;
  const diamondBalance = getDailyDiamondBalance(user);

  const patch = omitUndefined({
    streakCount: nextStreakCount,
    lastLoginDate: startOfUtcDay(lastLoginDate) === startOfUtcDay(now) ? lastLoginDate || now : now,
    lastClaimDate: typeof user?.lastClaimDate === "number" ? undefined : 0,
    lastClaimAt: typeof user?.lastClaimAt === "number" ? undefined : lastClaimAt,
    diamondBalance: typeof user?.diamondBalance === "number" && user.diamondBalance === diamondBalance ? undefined : diamondBalance,
    nextDiamondClaimAt: typeof user?.nextDiamondClaimAt === "number" ? undefined : 0,
    canClaimDiamond,
    eliteProUntil: normalizedEliteProUntil !== nextEliteProUntil || typeof user?.eliteProUntil !== "number"
      ? normalizedEliteProUntil
      : undefined,
    proTrialExpiresAt: user?.proTrialExpiresAt !== normalizedProTrialExpiresAt ? normalizedProTrialExpiresAt : undefined,
    proTrialEndedPaywallPending: normalizedProTrialExpiresAt === null && nextProTrialExpiresAt > 0
      ? !hasActivePaidSubscription
      : undefined,
  });

  if (Object.keys(patch).length > 0) {
    await ctx.db.patch(user._id, patch);
    return {
      ...user,
      ...patch,
    };
  }

  return user;
}

function getLimitExceededMessage(state: ReturnType<typeof deriveSubscriptionState>) {
  return state.statusMessage;
}

function computeReviewPrompt(nextCount: number, lastPromptAt: number, ignoreCooldown?: boolean) {
  const cooldownMs = 30 * 24 * 60 * 60 * 1000;
  const cooldownActive = lastPromptAt > 0 && Date.now() - lastPromptAt < cooldownMs;
  return ignoreCooldown ? nextCount >= 2 : !cooldownActive && (nextCount === 2 || nextCount === 3);
}

const DIAMOND_PACK_COUNTS = {
  starter: 10,
  designer: 30,
  architect: 100,
  estate: 300,
} as const;
const REFERRAL_INSTALL_REWARD_DIAMONDS = 1;
const REFERRAL_PRO_REWARD_DIAMONDS = 5;
const ELITE_MILESTONE_REWARDS: Record<number, number> = {
  [ELITE_PASS_MILESTONE_DAY]: ELITE_PASS_REWARD_DIAMONDS,
};
type DiamondSource = "daily_free" | "purchased_pack" | "referral";
const DIAMOND_SOURCES = new Set<DiamondSource>(["daily_free", "purchased_pack", "referral"]);

function isDiamondSource(value: unknown): value is DiamondSource {
  return typeof value === "string" && DIAMOND_SOURCES.has(value as DiamondSource);
}

function normalizeDiamondSourcesForBalance(user: any, creditsOverride?: number) {
  const credits = Math.max(toFiniteNumber(creditsOverride ?? user?.credits, FREE_IMAGE_LIMIT), 0);
  const existing = Array.isArray(user?.diamondSources)
    ? user.diamondSources.filter(isDiamondSource)
    : [];

  if (existing.length === credits) {
    return existing;
  }
  if (existing.length > credits) {
    return existing.slice(existing.length - credits);
  }

  const missing = credits - existing.length;
  if (existing.length > 0) {
    return [
      ...existing,
      ...Array.from({ length: missing }, () => "daily_free" as const),
    ];
  }

  const purchasedCount = Math.min(Math.max(toFiniteNumber(user?.premiumCredits), 0), credits);
  const freeCount = Math.max(credits - purchasedCount, 0);
  return [
    ...Array.from({ length: freeCount }, () => "daily_free" as const),
    ...Array.from({ length: purchasedCount }, () => "purchased_pack" as const),
  ];
}

function appendDiamondSources(user: any, nextCredits: number, source: DiamondSource, count: number) {
  return [
    ...normalizeDiamondSourcesForBalance(user, Math.max(nextCredits - count, 0)),
    ...Array.from({ length: count }, () => source),
  ];
}

function removeOneDiamondSource(sources: DiamondSource[], source: DiamondSource) {
  const next = [...sources];
  const index = next.lastIndexOf(source);
  if (index >= 0) {
    next.splice(index, 1);
  }
  return next;
}

function startOfUtcDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function resolveDisplayStreakCount(currentStreak: number, lastClaimDate: number, now: number) {
  if (lastClaimDate <= 0) {
    return 1;
  }

  return now - lastClaimDate > ELITE_PASS_GRACE_MS ? 1 : Math.max(currentStreak, 1);
}

function isEliteMilestoneDay(streakCount: number) {
  return Object.prototype.hasOwnProperty.call(ELITE_MILESTONE_REWARDS, streakCount);
}

function resolveClaimFlag(user: any, now: number) {
  const diamondBalance = getDailyDiamondBalance(user);
  const lastClaimDate = getLastClaimAt(user);
  const nextDiamondClaimAt = toFiniteNumber(user?.nextDiamondClaimAt);
  const effectiveNextClaimAt = Math.max(
    lastClaimDate > 0 ? lastClaimDate + FREE_REFILL_INTERVAL_MS : 0,
    nextDiamondClaimAt,
  );
  return diamondBalance < FREE_DAILY_DIAMOND_CAP && (effectiveNextClaimAt <= 0 || now >= effectiveNextClaimAt);
}

function getLastClaimAt(user: any) {
  return Math.max(toFiniteNumber(user?.lastClaimAt), toFiniteNumber(user?.lastClaimDate));
}

function getDailyDiamondBalance(user: any) {
  const fallback = Math.min(Math.max(toFiniteNumber(user?.credits, INITIAL_FREE_DIAMONDS), 0), FREE_DAILY_DIAMOND_CAP);
  return Math.min(Math.max(toFiniteNumber(user?.diamondBalance, fallback), 0), FREE_DAILY_DIAMOND_CAP);
}

function resolveClaimStreakCount(currentStreak: number, lastClaimDate: number, now: number) {
  if (lastClaimDate <= 0) {
    return 1;
  }

  const elapsedSinceClaim = now - lastClaimDate;
  if (elapsedSinceClaim < FREE_REFILL_INTERVAL_MS) {
    return Math.max(currentStreak, 1);
  }
  if (elapsedSinceClaim <= ELITE_PASS_GRACE_MS) {
    return Math.max(currentStreak, 1) + 1;
  }

  return 1;
}

function normalizeReferralCode(value?: string | null) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

async function getUserByReferralCode(ctx: any, referralCode?: string | null) {
  const normalizedCode = normalizeReferralCode(referralCode);
  if (!normalizedCode) {
    return null;
  }

  const exact = await ctx.db
    .query("users")
    .withIndex("by_referralCode", (q: any) => q.eq("referralCode", normalizedCode))
    .unique();
  if (exact) {
    return exact;
  }

  const uppercaseCode = normalizedCode.toUpperCase();
  if (uppercaseCode === normalizedCode) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_referralCode", (q: any) => q.eq("referralCode", uppercaseCode))
    .unique();
}

async function findReferrerByCode(ctx: any, referralCode?: string | null) {
  const normalizedCode = normalizeReferralCode(referralCode);
  if (!normalizedCode) {
    return null;
  }

  return (
    await getUserByReferralCode(ctx, normalizedCode)
    ?? await getUserByClerkId(ctx, normalizedCode)
    ?? await getUserByAnonymousId(ctx, normalizedCode)
  );
}

async function createUniqueReferralCode(ctx: any, seed: string) {
  const baseCode = createReferralCode(seed);
  for (let suffix = 0; suffix < 36; suffix += 1) {
    const candidate = suffix === 0 ? baseCode : `${baseCode}${suffix.toString(36).toUpperCase()}`;
    const existing = await getUserByReferralCode(ctx, candidate);
    if (!existing) {
      return candidate;
    }
  }

  return `${baseCode}${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

async function ensureUserReferralCode(ctx: any, user: any, seed: string) {
  const existingCode = normalizeReferralCode(user?.referralCode);
  if (existingCode) {
    return existingCode;
  }

  const referralCode = await createUniqueReferralCode(ctx, seed);
  await ctx.db.patch(user._id, { referralCode });
  return referralCode;
}

async function grantReferralDiamonds(ctx: any, user: any, diamonds: number, patch?: Record<string, unknown>) {
  const currentCredits = Math.max(toFiniteNumber(user?.credits, FREE_IMAGE_LIMIT), 0);
  const nextCredits = currentCredits + diamonds;
  await ctx.db.patch(user._id, omitUndefined({
    credits: nextCredits,
    diamondSources: appendDiamondSources(user, nextCredits, "referral", diamonds),
    ...(patch ?? {}),
  }));
}

function buildViewerResponse(user: any) {
  if (!user) {
    return null;
  }

  const state = deriveSubscriptionState(user, Date.now());
  return {
    ...user,
    credits: state.remaining,
    diamondBalance: state.diamondBalance,
    premiumCredits: state.premiumCredits,
    plan: state.plan,
    subscriptionType: state.subscriptionType,
    subscriptionEntitlement: state.subscriptionEntitlement,
    subscriptionStartedAt: state.subscriptionStartedAt,
    subscriptionEnd: state.subscriptionEnd,
    imageLimit: state.limit,
    imageGenerationCount: state.imageGenerationCount,
    lastResetDate: state.lastResetDate,
    streakCount: state.streakCount,
    streak_count: state.streakCount,
    lastLoginDate: state.lastLoginDate,
    lastClaimDate: state.lastClaimDate,
    lastClaimAt: state.lastClaimAt,
    nextDiamondClaimAt: state.nextDiamondClaimAt,
    canClaimDiamond: state.canClaimDiamond,
    eliteProUntil: state.eliteProUntil,
    proTrialExpiresAt: state.proTrialExpiresAt,
    shouldShowProTrialEndedPaywall: Boolean(user.proTrialEndedPaywallPending),
    proTrialEndedPaywallMessage: user.proTrialEndedPaywallPending
      ? "Your Pro Trial ended — continue designing?"
      : null,
    generationResetAt: state.nextResetDate,
    imageGenerationLimit: state.limit,
    imagesRemaining: state.remaining,
    subscriptionActive: state.active,
    generationLimitReached: state.reachedLimit,
    canGenerateNow: !state.blocked,
    generationStatusLabel: state.statusLabel,
    generationStatusMessage: state.statusMessage,
    hasPaidAccess: state.hasPaidAccess,
    hasProAccess: state.hasProAccess,
    canExport4k: state.canExport4k,
    canRemoveWatermark: state.canRemoveWatermark,
    canVirtualStage: state.canVirtualStage,
    canEditDesigns: state.canEditDesigns,
    generationQualityTier: state.generationPolicy.qualityTier,
    generationOutputResolution: state.generationPolicy.outputResolution,
    generationSpeedTier: state.generationPolicy.speedTier,
    priorityProcessing: state.generationPolicy.priorityProcessing,
    lastRefillTimestamp: state.lastResetDate,
    nextRefillTimestamp: state.nextDiamondClaimAt,
    pricingTier: user.pricingTier ?? null,
    pricingCountryCode: user.pricingCountryCode ?? null,
    pricingCurrencyCode: user.pricingCurrencyCode ?? null,
    notificationsDeclined: Boolean(user.notificationsDeclined),
    notificationsPermissionRequestedAt: toFiniteNumber(user.notificationsPermissionRequestedAt),
    notificationsPermissionGrantedAt: toFiniteNumber(user.notificationsPermissionGrantedAt),
    proTipNotificationIndex: toFiniteNumber(user.proTipNotificationIndex),
    isGuest: !user.clerkId,
  };
}

function buildDiamondStateResponse(user: any) {
  if (!user) {
    return null;
  }

  const now = Date.now();
  const state = deriveSubscriptionState(user, now);
  const diamondBalance = getDailyDiamondBalance({ ...user, diamondBalance: state.diamondBalance });
  const lastClaimAt = Math.max(state.lastClaimAt, state.lastClaimDate);
  const nextEligibleAt = lastClaimAt > 0 ? lastClaimAt + FREE_REFILL_INTERVAL_MS : now;
  const canClaimDiamond =
    diamondBalance < FREE_DAILY_DIAMOND_CAP
    && (lastClaimAt <= 0 || now - lastClaimAt >= FREE_REFILL_INTERVAL_MS);

  return {
    userId: user.clerkId ?? (user.anonymousId ? toGuestUserId(user.anonymousId) : String(user._id)),
    credits: Math.max(state.credits, 0),
    diamondBalance,
    diamondCap: FREE_DAILY_DIAMOND_CAP,
    premiumCredits: state.premiumCredits,
    streakCount: state.streakCount,
    streak_count: state.streakCount,
    lastClaimAt,
    lastClaimDate: state.lastClaimDate,
    nextEligibleAt,
    nextDiamondClaimAt: state.nextDiamondClaimAt || nextEligibleAt,
    canClaimDiamond,
    claimStatus: diamondBalance >= FREE_DAILY_DIAMOND_CAP
      ? "already_at_cap"
      : !canClaimDiamond && lastClaimAt > 0
        ? "already_claimed_today"
        : "claimed",
    dailyClaimLockedMessage: diamondBalance >= FREE_DAILY_DIAMOND_CAP
      ? "Come back after you design!"
      : null,
    proTrialExpiresAt: state.proTrialExpiresAt,
    eliteProUntil: state.eliteProUntil,
    hasPaidAccess: state.hasPaidAccess,
    hasProAccess: state.hasProAccess,
    notificationsDeclined: Boolean(user.notificationsDeclined),
    proTipNotificationIndex: toFiniteNumber(user.proTipNotificationIndex),
    canGenerateNow: !state.blocked,
    shouldShowProTrialEndedPaywall: Boolean(user.proTrialEndedPaywallPending),
    proTrialEndedPaywallMessage: user.proTrialEndedPaywallPending
      ? "Your Pro Trial ended — continue designing?"
      : null,
  };
}

async function claimDailyDiamondHandler(ctx: any, args: { anonymousId?: string }) {
  const viewer = await ensureViewerUser(ctx, args.anonymousId);
  const now = Date.now();
  const user = await syncDailyStreakState(ctx, viewer.user, now);
  const state = deriveSubscriptionState(user, now);
  const lastClaimAt = getLastClaimAt(user);
  const elapsedSinceClaim = lastClaimAt > 0 ? now - lastClaimAt : Number.POSITIVE_INFINITY;
  const currentDiamondBalance = getDailyDiamondBalance(user);
  const currentCredits = Math.max(toFiniteNumber(user.credits, state.credits), 0);
  const nextEligibleAt = lastClaimAt > 0 ? lastClaimAt + FREE_REFILL_INTERVAL_MS : now;

  if (currentDiamondBalance >= FREE_DAILY_DIAMOND_CAP) {
    return {
      status: "already_at_cap" as const,
      granted: false,
      creditsAdded: 0,
      credits: currentCredits,
      diamondBalance: currentDiamondBalance,
      canClaimDiamond: false,
      streakCount: state.streakCount,
      streak_count: state.streakCount,
      nextEligibleAt,
      nextDiamondClaimAt: state.nextDiamondClaimAt,
      message: "Come back after you design!",
      elitePassActivated: false,
      eliteProUntil: state.eliteProUntil,
      proTrialExpiresAt: state.proTrialExpiresAt,
      hasProAccess: state.hasProAccess,
    };
  }

  if (lastClaimAt > 0 && elapsedSinceClaim < FREE_REFILL_INTERVAL_MS) {
    return {
      status: "already_claimed_today" as const,
      granted: false,
      creditsAdded: 0,
      credits: currentCredits,
      diamondBalance: currentDiamondBalance,
      canClaimDiamond: false,
      streakCount: state.streakCount,
      streak_count: state.streakCount,
      nextEligibleAt,
      nextDiamondClaimAt: nextEligibleAt,
      elitePassActivated: false,
      eliteProUntil: state.eliteProUntil,
      proTrialExpiresAt: state.proTrialExpiresAt,
      hasProAccess: state.hasProAccess,
    };
  }

  const streakWasBroken = lastClaimAt > 0 && elapsedSinceClaim > ELITE_PASS_GRACE_MS;
  const nextStreakCount = resolveClaimStreakCount(state.streakCount, lastClaimAt, now);
  const elitePassActivated = isEliteMilestoneDay(nextStreakCount);
  const creditsAdded = 1;
  const nextDiamondBalance = Math.min(currentDiamondBalance + creditsAdded, FREE_DAILY_DIAMOND_CAP);
  const nextCredits = currentCredits + creditsAdded;
  const proTrialExpiresAt = elitePassActivated
    ? Math.max(toFiniteNumber(state.proTrialExpiresAt), now + ELITE_PASS_PRO_MS)
    : toFiniteNumber(state.proTrialExpiresAt);
  const eliteProUntil = elitePassActivated
    ? Math.max(state.eliteProUntil, proTrialExpiresAt)
    : state.eliteProUntil;
  const nextDiamondClaimAt = now + FREE_REFILL_INTERVAL_MS;

  await ctx.db.patch(user._id, {
    credits: nextCredits,
    diamondBalance: nextDiamondBalance,
    diamondSources: appendDiamondSources(user, nextCredits, "daily_free", creditsAdded),
    streakCount: nextStreakCount,
    lastClaimDate: now,
    lastClaimAt: now,
    lastRewardDate: now,
    nextDiamondClaimAt,
    canClaimDiamond: false,
    eliteProUntil,
    proTrialExpiresAt: proTrialExpiresAt > 0 ? proTrialExpiresAt : null,
    ...(elitePassActivated ? { proTrialEndedPaywallPending: false, proTrialEndedPaywallShownAt: 0 } : {}),
  });

  return {
    status: streakWasBroken ? ("streak_broken" as const) : ("claimed" as const),
    granted: true,
    creditsAdded,
    credits: nextCredits,
    diamondBalance: nextDiamondBalance,
    canClaimDiamond: false,
    streakCount: nextStreakCount,
    streak_count: nextStreakCount,
    nextEligibleAt: nextDiamondClaimAt,
    nextDiamondClaimAt,
    elitePassActivated,
    eliteProUntil,
    proTrialExpiresAt: proTrialExpiresAt > 0 ? proTrialExpiresAt : null,
    hasProAccess: eliteProUntil > now || state.hasProAccess,
  };
}

export const claimDailyDiamond = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await claimDailyDiamondHandler(ctx, args);
  },
});

export const claimDailyDiamondReward = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await claimDailyDiamondHandler(ctx, args);
  },
});

export const claimOnboardingDiamond = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    const user = viewer.user;
    const now = Date.now();
    const alreadyClaimedAt = toFiniteNumber(user.onboardingDiamondClaimedAt);
    const currentCredits = Math.max(toFiniteNumber(user.credits), 0);

    if (alreadyClaimedAt > 0) {
      return {
        granted: false,
        credits: currentCredits,
        claimedAt: alreadyClaimedAt,
      };
    }

    const nextCredits = Math.max(currentCredits, FREE_IMAGE_LIMIT);
    const creditsAdded = Math.max(nextCredits - currentCredits, 0);
    const nextDiamondBalance = Math.min(
      Math.max(getDailyDiamondBalance(user), FREE_IMAGE_LIMIT),
      FREE_DAILY_DIAMOND_CAP,
    );
    await ctx.db.patch(user._id, {
      credits: nextCredits,
      diamondBalance: nextDiamondBalance,
      diamondSources: creditsAdded > 0
        ? appendDiamondSources(user, nextCredits, "daily_free", creditsAdded)
        : normalizeDiamondSourcesForBalance(user, nextCredits),
      onboardingDiamondClaimedAt: now,
      canClaimDiamond: false,
      nextDiamondClaimAt: 0,
      lastClaimDate: now,
      lastClaimAt: now,
    });

    return {
      granted: nextCredits > currentCredits,
      credits: nextCredits,
      claimedAt: now,
    };
  },
});

async function getOrCreateClerkUser(ctx: any, clerkId: string) {
  const existing = await getUserByClerkId(ctx, clerkId);
  if (existing) {
    const now = Date.now();
    const streakSynced = await syncDailyStreakState(ctx, existing, now);
    const state = deriveSubscriptionState(streakSynced, now);
    const referralCode = normalizeReferralCode(streakSynced.referralCode) ?? await createUniqueReferralCode(ctx, clerkId);
    const patch = omitUndefined({
      credits: toFiniteNumber(streakSynced.credits, INITIAL_FREE_DIAMONDS),
      diamondSources: normalizeDiamondSourcesForBalance(streakSynced, toFiniteNumber(streakSynced.credits, INITIAL_FREE_DIAMONDS)),
      referralCode,
      referralCount: toFiniteNumber(streakSynced.referralCount),
      referralProCount: toFiniteNumber(streakSynced.referralProCount),
      lastRewardDate: toFiniteNumber(existing.lastRewardDate, now),
      ...state.patch,
    });
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
    }
    return (await ctx.db.get(existing._id)) ?? streakSynced;
  }

  const id = await ctx.db.insert(
    "users",
    buildDefaultUserFields({
      clerkId,
      referralCode: await createUniqueReferralCode(ctx, clerkId),
    }),
  );

  const created = await ctx.db.get(id);
  if (!created) {
    throw new Error("Failed to create user");
  }

  return await syncDailyStreakState(ctx, created, Date.now());
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
    const rawUser = viewer.user ?? (await getOrCreateClerkUser(ctx, viewer.clerkId));
    const user = await syncDailyStreakState(ctx, rawUser, Date.now());
    return { ...viewer, user };
  }

  const rawUser = viewer.user ?? (await ensureGuestUser(ctx, viewer.anonymousId));
  const user = await syncDailyStreakState(ctx, rawUser, Date.now());
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
  const guestPremiumCredits = toFiniteNumber(guestUser.premiumCredits);
  const accountCredits = toFiniteNumber(accountUser.credits);
  const accountPremiumCredits = toFiniteNumber(accountUser.premiumCredits);
  const mergedCredits = accountCredits + guestCredits;
  const mergedDiamondBalance = Math.min(
    getDailyDiamondBalance(accountUser) + getDailyDiamondBalance(guestUser),
    FREE_DAILY_DIAMOND_CAP,
  );
  const guestGenerationCount = toFiniteNumber(guestUser.generationCount);
  const guestImageGenerationCount = toFiniteNumber(guestUser.imageGenerationCount);
  const guestReferralCount = toFiniteNumber(guestUser.referralCount);
  const guestReferralProCount = toFiniteNumber(guestUser.referralProCount);
  const mergedStreakCount = Math.max(
    toFiniteNumber(accountUser.streakCount, 1),
    toFiniteNumber(guestUser.streakCount, 1),
  );
  const nextClaimCandidates = [
    toFiniteNumber(accountUser.nextDiamondClaimAt),
    toFiniteNumber(guestUser.nextDiamondClaimAt),
  ].filter((value) => value > 0);

  await transferOwnedDocuments(ctx, guestOwnerId, clerkId);

  await ctx.db.patch(accountUser._id, omitUndefined({
    credits: mergedCredits,
    diamondBalance: mergedDiamondBalance,
    diamondSources: [
      ...normalizeDiamondSourcesForBalance(accountUser, accountCredits),
      ...normalizeDiamondSourcesForBalance(guestUser, guestCredits),
    ],
    premiumCredits: accountPremiumCredits + guestPremiumCredits,
    generationCount: toFiniteNumber(accountUser.generationCount) + guestGenerationCount,
    imageGenerationCount:
      toFiniteNumber(accountUser.imageGenerationCount) + guestImageGenerationCount,
    referralCount: toFiniteNumber(accountUser.referralCount) + guestReferralCount,
    referralProCount: toFiniteNumber(accountUser.referralProCount) + guestReferralProCount,
    referredBy: accountUser.referredBy ?? guestUser.referredBy,
    referralInstallRewardedAt:
      toFiniteNumber(accountUser.referralInstallRewardedAt) || toFiniteNumber(guestUser.referralInstallRewardedAt) || undefined,
    referralProRewardedAt:
      toFiniteNumber(accountUser.referralProRewardedAt) || toFiniteNumber(guestUser.referralProRewardedAt) || undefined,
    streakCount: mergedStreakCount,
    lastLoginDate: Math.max(toFiniteNumber(accountUser.lastLoginDate), toFiniteNumber(guestUser.lastLoginDate)),
    lastClaimDate: Math.max(toFiniteNumber(accountUser.lastClaimDate), toFiniteNumber(guestUser.lastClaimDate)),
    lastClaimAt: Math.max(getLastClaimAt(accountUser), getLastClaimAt(guestUser)),
    nextDiamondClaimAt: nextClaimCandidates.length > 0 ? Math.min(...nextClaimCandidates) : 0,
    canClaimDiamond: Boolean(accountUser.canClaimDiamond || guestUser.canClaimDiamond),
    eliteProUntil: Math.max(toFiniteNumber(accountUser.eliteProUntil), toFiniteNumber(guestUser.eliteProUntil)),
    proTrialExpiresAt: Math.max(toFiniteNumber(accountUser.proTrialExpiresAt), toFiniteNumber(guestUser.proTrialExpiresAt)) || null,
    proTrialEndedPaywallPending: Boolean(accountUser.proTrialEndedPaywallPending || guestUser.proTrialEndedPaywallPending),
    lastRewardDate: Math.max(toFiniteNumber(accountUser.lastRewardDate), toFiniteNumber(guestUser.lastRewardDate)),
    lastReviewPromptAt: Math.max(toFiniteNumber(accountUser.lastReviewPromptAt), toFiniteNumber(guestUser.lastReviewPromptAt)),
    expoPushToken: accountUser.expoPushToken ?? guestUser.expoPushToken,
    devicePushToken: accountUser.devicePushToken ?? guestUser.devicePushToken,
    notificationPlatform: accountUser.notificationPlatform ?? guestUser.notificationPlatform,
    notificationsDeclined: Boolean(accountUser.notificationsDeclined || guestUser.notificationsDeclined),
    notificationsPermissionRequestedAt: Math.max(toFiniteNumber(accountUser.notificationsPermissionRequestedAt), toFiniteNumber(guestUser.notificationsPermissionRequestedAt)),
    notificationsPermissionGrantedAt: Math.max(toFiniteNumber(accountUser.notificationsPermissionGrantedAt), toFiniteNumber(guestUser.notificationsPermissionGrantedAt)),
    proTipNotificationIndex: toFiniteNumber(accountUser.proTipNotificationIndex) || toFiniteNumber(guestUser.proTipNotificationIndex),
  }));

  await ctx.db.patch(guestUser._id, {
    credits: 0,
    diamondBalance: 0,
    diamondSources: [],
    premiumCredits: 0,
    generationCount: 0,
    imageGenerationCount: 0,
    canClaimDiamond: false,
    nextDiamondClaimAt: 0,
    eliteProUntil: 0,
    proTrialExpiresAt: null,
    proTrialEndedPaywallPending: false,
    reviewPrompted: false,
    notificationsDeclined: false,
    notificationsPermissionRequestedAt: 0,
    notificationsPermissionGrantedAt: 0,
    proTipNotificationIndex: 0,
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

    return await syncDailyStreakState(ctx, guestUser, Date.now());
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

export const getUserDiamondState = queryGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await resolveViewer(ctx, {
      anonymousId: args.anonymousId,
      createGuest: false,
      requireViewer: false,
    });
    return buildDiamondStateResponse(viewer?.user ?? null);
  },
});

export const updateNotificationPreferences = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    expoPushToken: v.optional(v.string()),
    devicePushToken: v.optional(v.string()),
    notificationPlatform: v.optional(v.string()),
    notificationsDeclined: v.optional(v.boolean()),
    notificationsPermissionRequestedAt: v.optional(v.number()),
    notificationsPermissionGrantedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    await ctx.db.patch(viewer.user._id, omitUndefined({
      expoPushToken: args.expoPushToken,
      devicePushToken: args.devicePushToken,
      notificationPlatform: args.notificationPlatform,
      notificationsDeclined: args.notificationsDeclined,
      notificationsPermissionRequestedAt: args.notificationsPermissionRequestedAt,
      notificationsPermissionGrantedAt: args.notificationsPermissionGrantedAt,
    }));

    return { ok: true };
  },
});

export const setProTipNotificationIndex = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    nextIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    const normalizedIndex = Math.max(0, Math.floor(args.nextIndex)) % 8;
    await ctx.db.patch(viewer.user._id, {
      proTipNotificationIndex: normalizedIndex,
    });

    return { ok: true, proTipNotificationIndex: normalizedIndex };
  },
});

export const markProTrialEndedPaywallShown = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    const now = Date.now();
    await ctx.db.patch(viewer.user._id, {
      proTrialEndedPaywallPending: false,
      proTrialEndedPaywallShownAt: now,
    });
    return { ok: true, shownAt: now };
  },
});

export const checkProTrialExpiry = internalMutationGeneric({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredTrials = await ctx.db
      .query("users")
      .withIndex("by_proTrialExpiresAt", (q: any) => q.gt("proTrialExpiresAt", 0).lte("proTrialExpiresAt", now))
      .collect();

    let expiredCount = 0;
    for (const user of expiredTrials) {
      const proTrialExpiresAt = toFiniteNumber(user.proTrialExpiresAt);
      if (proTrialExpiresAt <= 0 || proTrialExpiresAt > now) {
        continue;
      }

      const subscriptionEnd = toFiniteNumber(user.subscriptionEnd);
      const hasPaidSubscription =
        (user.subscriptionType === "weekly" || user.subscriptionType === "yearly")
        && subscriptionEnd > now;
      const eliteProUntil = toFiniteNumber(user.eliteProUntil);

      await ctx.db.patch(user._id, omitUndefined({
        proTrialExpiresAt: null,
        eliteProUntil: eliteProUntil <= now ? 0 : eliteProUntil,
        plan: !hasPaidSubscription && user.plan === "trial" ? "free" : undefined,
        subscriptionType: !hasPaidSubscription && user.subscriptionType === "free" ? "free" : undefined,
        subscriptionEntitlement: !hasPaidSubscription && user.subscriptionEntitlement === "free" ? "free" : undefined,
        proTrialEndedPaywallPending: !hasPaidSubscription,
      }));
      expiredCount += 1;
    }

    return { ok: true, expiredCount };
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

  if ((nextPlan === "pro" || nextPlan === "trial") && !user.referralProRewardedAt) {
    const referrer = await findReferrerByCode(ctx, user.referredBy);
    if (referrer && referrer._id !== user._id) {
      const now = Date.now();
      await grantReferralDiamonds(ctx, referrer, REFERRAL_PRO_REWARD_DIAMONDS, {
        referralProCount: toFiniteNumber(referrer.referralProCount) + 1,
      });
      await ctx.db.patch(user._id, {
        referralProRewardedAt: now,
      });
    }
  }

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
    pricingTier: v.optional(v.string()),
    pricingCountryCode: v.optional(v.string()),
    pricingCurrencyCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    await persistRevenueCatPlanForUser(ctx, viewer.user, args);
    await ctx.db.patch(viewer.user._id, omitUndefined({
      pricingTier: args.pricingTier,
      pricingCountryCode: args.pricingCountryCode,
      pricingCurrencyCode: args.pricingCurrencyCode,
    }));
    return { ok: true, viewerKind: viewer.kind };
  },
});

export const fulfillDiamondPurchase = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
    transactionId: v.string(),
    productIdentifier: v.string(),
    packageIdentifier: v.optional(v.string()),
    packId: v.union(v.literal("starter"), v.literal("designer"), v.literal("architect"), v.literal("estate")),
    purchasedAt: v.optional(v.number()),
    amount: v.number(),
    currencyCode: v.string(),
    pricingTier: v.optional(v.string()),
    countryCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    const existingPurchase = await ctx.db
      .query("diamondPurchases")
      .withIndex("by_transactionId", (q: any) => q.eq("transactionId", args.transactionId))
      .unique();

    if (existingPurchase) {
      const refreshedUser = await ctx.db.get(viewer.user._id);
      return {
        ok: true,
        duplicated: true,
        credits: Math.max(toFiniteNumber(refreshedUser?.credits, FREE_IMAGE_LIMIT), 0),
        diamondsAdded: 0,
      };
    }

    const diamondsAdded = DIAMOND_PACK_COUNTS[args.packId];
    const nextCredits = Math.max(toFiniteNumber(viewer.user.credits, FREE_IMAGE_LIMIT), 0) + diamondsAdded;
    const nextPremiumCredits = Math.max(toFiniteNumber(viewer.user.premiumCredits), 0) + diamondsAdded;

    await ctx.db.patch(viewer.user._id, {
      credits: nextCredits,
      diamondSources: appendDiamondSources(viewer.user, nextCredits, "purchased_pack", diamondsAdded),
      premiumCredits: nextPremiumCredits,
      pricingTier: args.pricingTier ?? viewer.user.pricingTier,
      pricingCountryCode: args.countryCode ?? viewer.user.pricingCountryCode,
      pricingCurrencyCode: args.currencyCode || viewer.user.pricingCurrencyCode,
    });

    await ctx.db.insert("diamondPurchases", {
      transactionId: args.transactionId,
      userId: viewer.userId,
      productIdentifier: args.productIdentifier,
      packageIdentifier: args.packageIdentifier,
      packId: args.packId,
      diamonds: diamondsAdded,
      amount: args.amount,
      currencyCode: args.currencyCode,
      countryCode: args.countryCode,
      pricingTier: args.pricingTier,
      purchasedAt: args.purchasedAt ?? Date.now(),
      createdAt: Date.now(),
    });

    return {
      ok: true,
      duplicated: false,
      credits: nextCredits,
      premiumCredits: nextPremiumCredits,
      diamondsAdded,
    };
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
          referralCode: await createUniqueReferralCode(ctx, args.clerkId),
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
        message: "No Diamonds left. Buy more to continue.",
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
  const usesDiamondAllowance = state.subscriptionType === "free" && !state.hasPaidAccess;
  const nextImageGenerationCount = usesDiamondAllowance ? state.imageGenerationCount : state.imageGenerationCount + 1;
  const lastPromptAt = toFiniteNumber(user.lastReviewPromptAt);
  const shouldPrompt = computeReviewPrompt(nextGenerationCount, lastPromptAt, ignoreCooldown);
  const usesPremiumDiamond = usesDiamondAllowance && state.premiumCredits > 0;
  const nextCredits = usesDiamondAllowance ? Math.max(state.credits - 1, 0) : state.credits;
  const nextPremiumCredits =
    usesPremiumDiamond
      ? Math.max(state.premiumCredits - 1, 0)
      : state.premiumCredits;
  const nextDiamondBalance =
    usesDiamondAllowance && !usesPremiumDiamond
      ? Math.max(state.diamondBalance - 1, 0)
      : state.diamondBalance;
  const usedDiamondSource = usesDiamondAllowance
    ? usesPremiumDiamond ? "purchased_pack" as const : "daily_free" as const
    : null;
  const nextDiamondSources = usedDiamondSource
    ? removeOneDiamondSource(normalizeDiamondSourcesForBalance(user, state.credits), usedDiamondSource)
    : normalizeDiamondSourcesForBalance(user, state.credits);
  const normalizedNextDiamondSources = nextDiamondSources.length > nextCredits
    ? nextDiamondSources.slice(nextDiamondSources.length - nextCredits)
    : nextDiamondSources;
  const nextLastResetDate = usesDiamondAllowance ? now : state.lastResetDate;
  const nextDiamondClaimAt =
    usesDiamondAllowance && nextCredits <= 0
      ? now + FREE_REFILL_INTERVAL_MS
      : usesDiamondAllowance && nextCredits > 0
        ? 0
        : state.nextDiamondClaimAt;

  await ctx.db.patch(user._id, {
    generationCount: nextGenerationCount,
    credits: nextCredits,
    diamondBalance: nextDiamondBalance,
    diamondSources: normalizedNextDiamondSources,
    premiumCredits: nextPremiumCredits,
    imageLimit: state.limit,
    imageGenerationCount: nextImageGenerationCount,
    lastResetDate: nextLastResetDate,
    nextDiamondClaimAt,
    canClaimDiamond: false,
    ...(state.patch.plan ? { plan: state.patch.plan } : {}),
    ...(state.patch.subscriptionType ? { subscriptionType: state.patch.subscriptionType } : {}),
    ...(state.patch.subscriptionEntitlement ? { subscriptionEntitlement: state.patch.subscriptionEntitlement } : {}),
    ...(typeof state.patch.subscriptionStartedAt === "number" ? { subscriptionStartedAt: state.patch.subscriptionStartedAt } : {}),
    ...(typeof state.patch.subscriptionEnd === "number" ? { subscriptionEnd: state.patch.subscriptionEnd } : {}),
    ...(typeof state.patch.imageLimit === "number" ? { imageLimit: state.patch.imageLimit } : {}),
  });

  const remaining =
    usesDiamondAllowance ? nextCredits : Math.max(state.limit - nextImageGenerationCount, 0);
  const statusLabel =
    usesDiamondAllowance
      ? `${remaining} Diamonds left`
      : state.plan === "trial"
        ? "Unlimited generations during your active trial"
        : "Unlimited generations";

  return {
    count: nextGenerationCount,
    shouldPrompt,
    credits: remaining,
    imageGenerationCount: nextImageGenerationCount,
    imageGenerationLimit: state.limit,
    imagesRemaining: remaining,
    subscriptionType: state.subscriptionType,
    generationStatusLabel: statusLabel,
    generationStatusMessage: usesDiamondAllowance && remaining <= 0 ? `Limit Reached - ${statusLabel}` : statusLabel,
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
    const usesDiamondAllowance = state.subscriptionType === "free" && !state.hasPaidAccess;
    const nextImageGenerationCount =
      usesDiamondAllowance ? state.imageGenerationCount : Math.max(state.imageGenerationCount - 1, 0);
    const currentCount = toFiniteNumber(user.generationCount);
    const nextGenerationCount = Math.max(currentCount - 1, 0);

    const restoredCredits = usesDiamondAllowance ? state.credits + 1 : state.credits;
    const restoredDiamondBalance = usesDiamondAllowance
      ? Math.min(state.diamondBalance + 1, FREE_DAILY_DIAMOND_CAP)
      : state.diamondBalance;
    await ctx.db.patch(user._id, {
      credits: restoredCredits,
      diamondBalance: restoredDiamondBalance,
      diamondSources: usesDiamondAllowance
        ? appendDiamondSources(user, restoredCredits, "daily_free", 1)
        : normalizeDiamondSourcesForBalance(user, restoredCredits),
      premiumCredits: state.premiumCredits,
      imageLimit: state.limit,
      imageGenerationCount: nextImageGenerationCount,
      generationCount: nextGenerationCount,
      ...(usesDiamondAllowance && restoredCredits > 0 ? { nextDiamondClaimAt: 0, canClaimDiamond: false } : {}),
      ...(state.patch.plan ? { plan: state.patch.plan } : {}),
      ...(state.patch.subscriptionType ? { subscriptionType: state.patch.subscriptionType } : {}),
      ...(state.patch.subscriptionEntitlement ? { subscriptionEntitlement: state.patch.subscriptionEntitlement } : {}),
      ...(typeof state.patch.subscriptionStartedAt === "number" ? { subscriptionStartedAt: state.patch.subscriptionStartedAt } : {}),
      ...(typeof state.patch.subscriptionEnd === "number" ? { subscriptionEnd: state.patch.subscriptionEnd } : {}),
      ...(typeof state.patch.imageLimit === "number" ? { imageLimit: state.patch.imageLimit } : {}),
      ...(typeof state.patch.lastResetDate === "number" ? { lastResetDate: state.patch.lastResetDate } : {}),
    });

    const remaining =
      usesDiamondAllowance ? state.credits + 1 : Math.max(state.limit - nextImageGenerationCount, 0);
    return {
      ok: true,
      credits: remaining,
      imageGenerationCount: nextImageGenerationCount,
      imagesRemaining: remaining,
      generationStatusLabel:
        usesDiamondAllowance
          ? `${remaining} Diamonds left`
          : state.plan === "trial"
            ? "Unlimited generations during your active trial"
            : "Unlimited generations",
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
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await ensureViewerUser(ctx, args.anonymousId);
    const current = viewer.user;
    if (!current) {
      throw new Error("No billing profile found.");
    }

    const normalizedCode = normalizeReferralCode(args.referralCode);
    if (!normalizedCode) {
      return { ok: false, reason: "invalid_referral" };
    }

    if (current.referredBy) {
      return { ok: false, reason: "already_referred" };
    }

    const currentReferralCode = await ensureUserReferralCode(
      ctx,
      current,
      current.clerkId ?? current.anonymousId ?? viewer.userId,
    );
    if (
      normalizedCode === currentReferralCode
      || normalizedCode === current.clerkId
      || normalizedCode === current.anonymousId
      || normalizedCode === viewer.userId
    ) {
      return { ok: false, reason: "self_referral" };
    }

    const referrer = await findReferrerByCode(ctx, normalizedCode);
    if (!referrer) {
      return { ok: false, reason: "invalid_referral" };
    }
    if (referrer._id === current._id) {
      return { ok: false, reason: "self_referral" };
    }

    const referrerCode = await ensureUserReferralCode(
      ctx,
      referrer,
      referrer.clerkId ?? referrer.anonymousId ?? referrer._id,
    );
    const now = Date.now();

    await grantReferralDiamonds(ctx, referrer, REFERRAL_INSTALL_REWARD_DIAMONDS, {
      referralCount: toFiniteNumber(referrer.referralCount) + 1,
    });

    await ctx.db.patch(current._id, {
      referredBy: referrerCode,
      referralInstallRewardedAt: now,
    });

    return {
      ok: true,
      referrerRewarded: REFERRAL_INSTALL_REWARD_DIAMONDS,
    };
  },
});

export const claimThreeDayReward = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await claimDailyDiamondHandler(ctx, args);
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
      for (const referenceStorageId of generation.referenceImageStorageIds ?? []) {
        await ctx.storage.delete(referenceStorageId);
      }
      if (generation.maskImageStorageId) {
        await ctx.storage.delete(generation.maskImageStorageId);
      }
      if (generation.sourceImageStorageId) {
        await ctx.storage.delete(generation.sourceImageStorageId);
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
