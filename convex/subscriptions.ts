export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
export const YEAR_MS = 365 * DAY_MS;
export const MONTHLY_RESET_MS = 30 * DAY_MS;
export const FREE_IMAGE_LIMIT = 1;
export const INITIAL_FREE_DIAMONDS = 1;
export const FREE_DAILY_DIAMOND_CAP = 2;
export const WEEKLY_IMAGE_LIMIT = Number.MAX_SAFE_INTEGER;
export const YEARLY_MONTHLY_IMAGE_LIMIT = Number.MAX_SAFE_INTEGER;
export const FREE_REFILL_INTERVAL_MS = DAY_MS;
export const ELITE_PASS_GRACE_MS = 26 * 60 * 60 * 1000;
export const ELITE_PASS_PRO_MS = 2 * DAY_MS;
export const ELITE_PASS_MILESTONE_DAY = 7;
export const ELITE_PASS_REWARD_DIAMONDS = 1;

export type SubscriptionType = "weekly" | "yearly" | "free";
export type SubscriptionEntitlement = "weekly_pro" | "annual_pro" | "free";
export type BillingPlan = "free" | "trial" | "pro";
export type GenerationQualityTier = "free" | "standard_hd" | "premium";
export type GenerationSpeedTier = "standard" | "pro" | "ultra";
export type GenerationOutputResolution = "1024x1024" | "1024x1536" | "1536x1024";

type SubscriptionLikeUser = {
  plan?: string;
  subscriptionType?: string;
  subscriptionEntitlement?: string;
  subscriptionStartedAt?: number | bigint;
  subscriptionEnd?: number | bigint;
  credits?: number | bigint;
  diamondBalance?: number | bigint;
  premiumCredits?: number | bigint;
  imageLimit?: number | bigint;
  imageGenerationCount?: number | bigint;
  lastResetDate?: number | bigint;
  streakCount?: number | bigint;
  lastLoginDate?: number | bigint;
  lastClaimDate?: number | bigint;
  lastClaimAt?: number | bigint;
  nextDiamondClaimAt?: number | bigint;
  canClaimDiamond?: boolean;
  eliteProUntil?: number | bigint;
  proTrialExpiresAt?: number | bigint | null;
  proTrialEndedPaywallPending?: boolean;
};

type PeriodWindow = {
  start: number;
  end: number;
};

export function toFiniteNumber(value: number | bigint | null | undefined, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    const coerced = Number(value);
    return Number.isFinite(coerced) ? coerced : fallback;
  }
  return fallback;
}

function normalizeSubscriptionType(input?: string | null): SubscriptionType {
  if (input === "weekly" || input === "yearly") {
    return input;
  }
  return "free";
}

function normalizeSubscriptionEntitlement(input?: string | null): SubscriptionEntitlement {
  if (input === "weekly_pro" || input === "annual_pro") {
    return input;
  }
  return "free";
}

function normalizePlan(input?: string | null): BillingPlan {
  if (input === "trial" || input === "pro") {
    return input;
  }
  return "free";
}

function getDaysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function buildMonthlyAnniversary(anchor: number, monthOffset: number) {
  const anchorDate = new Date(anchor);
  const anchorYear = anchorDate.getUTCFullYear();
  const anchorMonth = anchorDate.getUTCMonth();
  const absoluteMonth = anchorMonth + monthOffset;
  const targetYear = anchorYear + Math.floor(absoluteMonth / 12);
  const targetMonth = ((absoluteMonth % 12) + 12) % 12;
  const targetDay = Math.min(anchorDate.getUTCDate(), getDaysInUtcMonth(targetYear, targetMonth));

  return Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    anchorDate.getUTCHours(),
    anchorDate.getUTCMinutes(),
    anchorDate.getUTCSeconds(),
    anchorDate.getUTCMilliseconds(),
  );
}

function resolveWeeklyWindow(anchor: number, now: number): PeriodWindow {
  if (now <= anchor) {
    return {
      start: anchor,
      end: anchor + WEEK_MS,
    };
  }

  const cycleIndex = Math.floor((now - anchor) / WEEK_MS);
  const start = anchor + cycleIndex * WEEK_MS;
  return {
    start,
    end: start + WEEK_MS,
  };
}

function resolveMonthlyWindow(anchor: number, now: number): PeriodWindow {
  let monthOffset = 0;
  let start = anchor;
  let end = buildMonthlyAnniversary(anchor, 1);

  while (end <= now && monthOffset < 36) {
    monthOffset += 1;
    start = end;
    end = buildMonthlyAnniversary(anchor, monthOffset + 1);
  }

  return {
    start,
    end,
  };
}

function resolveSubscriptionWindow(subscriptionType: SubscriptionType, anchor: number, now: number) {
  if (subscriptionType === "weekly") {
    return resolveWeeklyWindow(anchor, now);
  }
  if (subscriptionType === "yearly") {
    return resolveMonthlyWindow(anchor, now);
  }
  return null;
}

function getSubscriptionAnchor(user: SubscriptionLikeUser, now: number) {
  const startedAt = toFiniteNumber(user.subscriptionStartedAt);
  if (startedAt > 0) {
    return startedAt;
  }

  const lastResetDate = toFiniteNumber(user.lastResetDate);
  if (lastResetDate > 0) {
    return lastResetDate;
  }

  return now;
}

export function getGenerationLimit(subscriptionType: SubscriptionType) {
  if (subscriptionType === "free") return FREE_IMAGE_LIMIT;
  if (subscriptionType === "weekly") return WEEKLY_IMAGE_LIMIT;
  if (subscriptionType === "yearly") return YEARLY_MONTHLY_IMAGE_LIMIT;
  return FREE_IMAGE_LIMIT;
}

export function getSubscriptionEndForType(subscriptionType: SubscriptionType, purchasedAt: number) {
  if (subscriptionType === "weekly") return purchasedAt + WEEK_MS;
  if (subscriptionType === "yearly") return purchasedAt + YEAR_MS;
  return 0;
}

export function canUserGenerateState(state: {
  plan: BillingPlan;
  active: boolean;
  blocked: boolean;
  hasPaidAccess: boolean;
  reachedLimit: boolean;
  remaining: number;
  statusMessage: string;
  subscriptionType: SubscriptionType;
}) {
  if (!state.blocked) {
    return {
      allowed: true,
      reason: "ok" as const,
      shouldTriggerPaywall: false,
      shouldShowLimitReached: false,
      message: state.statusMessage,
    };
  }

  if (state.subscriptionType === "free" && state.plan === "free") {
    return {
      allowed: false,
      reason: "paywall" as const,
      shouldTriggerPaywall: true,
      shouldShowLimitReached: false,
      message: state.remaining <= 0 ? "No Diamonds left. Buy more to continue." : state.statusMessage,
    };
  }

  return {
    allowed: false,
    reason: state.reachedLimit ? ("limit_reached" as const) : ("inactive" as const),
    shouldTriggerPaywall: false,
    shouldShowLimitReached: true,
    message: state.statusMessage,
  };
}

function getNextDailyClaimAt(lastClaimDate: number, nextDiamondClaimAt: number) {
  const lastClaimEligibleAt = lastClaimDate > 0 ? lastClaimDate + FREE_REFILL_INTERVAL_MS : 0;
  return Math.max(lastClaimEligibleAt, nextDiamondClaimAt);
}

export function resolveGenerationPolicy(state: {
  plan: BillingPlan;
  hasPaidAccess: boolean;
  hasProAccess?: boolean;
  subscriptionType: SubscriptionType;
  usesPremiumDiamond?: boolean;
}) {
  const isSubscriptionPaid = state.hasPaidAccess && (state.plan === "pro" || state.plan === "trial");
  const hasProAccess = state.hasProAccess ?? isSubscriptionPaid;
  const usesPremiumDiamond = state.usesPremiumDiamond === true && !isSubscriptionPaid;
  const outputResolution: GenerationOutputResolution = usesPremiumDiamond ? "1536x1024" : "1024x1024";

  return {
    qualityTier: (usesPremiumDiamond ? "premium" : hasProAccess ? "standard_hd" : "free") as GenerationQualityTier,
    outputResolution,
    speedTier: (
      hasProAccess
        ? state.subscriptionType === "yearly"
          ? "ultra"
          : "pro"
        : usesPremiumDiamond
          ? "pro"
        : "standard"
    ) as GenerationSpeedTier,
    watermarkRequired: !hasProAccess,
    priorityProcessing: hasProAccess || usesPremiumDiamond,
  };
}

export function deriveSubscriptionState(user: SubscriptionLikeUser, now: number) {
  let plan = normalizePlan(user.plan);
  let subscriptionType = normalizeSubscriptionType(user.subscriptionType);
  let subscriptionEntitlement = normalizeSubscriptionEntitlement(user.subscriptionEntitlement);
  let subscriptionStartedAt = getSubscriptionAnchor(user, now);
  let subscriptionEnd = toFiniteNumber(user.subscriptionEnd);
  let credits = Math.max(toFiniteNumber(user.credits, FREE_IMAGE_LIMIT), 0);
  let diamondBalance = Math.min(
    Math.max(
      toFiniteNumber(
        user.diamondBalance,
        Math.min(credits, FREE_DAILY_DIAMOND_CAP),
      ),
      0,
    ),
    FREE_DAILY_DIAMOND_CAP,
  );
  let premiumCredits = Math.min(Math.max(toFiniteNumber(user.premiumCredits), 0), credits);
  let imageLimit = toFiniteNumber(user.imageLimit, getGenerationLimit(subscriptionType));
  let imageGenerationCount = toFiniteNumber(user.imageGenerationCount);
  let lastResetDate = toFiniteNumber(user.lastResetDate);
  let streakCount = Math.max(toFiniteNumber(user.streakCount, 1), 1);
  let lastLoginDate = toFiniteNumber(user.lastLoginDate, now);
  let lastClaimDate = toFiniteNumber(user.lastClaimDate);
  let lastClaimAt = toFiniteNumber(user.lastClaimAt, lastClaimDate);
  let nextDiamondClaimAt = toFiniteNumber(user.nextDiamondClaimAt);
  let canClaimDiamond = Boolean(user.canClaimDiamond);
  let eliteProUntil = toFiniteNumber(user.eliteProUntil);
  let proTrialExpiresAt = toFiniteNumber(user.proTrialExpiresAt);

  const patch: Record<string, number | string | boolean | null> = {};

  if (user.subscriptionType !== subscriptionType) {
    patch.subscriptionType = subscriptionType;
  }
  if (user.subscriptionEntitlement !== subscriptionEntitlement) {
    patch.subscriptionEntitlement = subscriptionEntitlement;
  }
  if (typeof user.subscriptionStartedAt !== "number") {
    patch.subscriptionStartedAt = subscriptionStartedAt;
  }
  if (typeof user.subscriptionEnd !== "number") {
    patch.subscriptionEnd = subscriptionEnd;
  }
  if (typeof user.credits !== "number") {
    patch.credits = credits;
  }
  if (typeof user.diamondBalance !== "number" || user.diamondBalance !== diamondBalance) {
    patch.diamondBalance = diamondBalance;
  }
  if (typeof user.premiumCredits !== "number") {
    patch.premiumCredits = premiumCredits;
  }
  if (typeof user.imageLimit !== "number") {
    patch.imageLimit = imageLimit;
  }
  if (typeof user.imageGenerationCount !== "number") {
    patch.imageGenerationCount = imageGenerationCount;
  }
  if (typeof user.lastResetDate !== "number") {
    patch.lastResetDate = lastResetDate;
  }
  if (typeof user.streakCount !== "number") {
    patch.streakCount = streakCount;
  }
  if (typeof user.lastLoginDate !== "number") {
    patch.lastLoginDate = lastLoginDate;
  }
  if (typeof user.lastClaimDate !== "number") {
    patch.lastClaimDate = lastClaimDate;
  }
  if (typeof user.lastClaimAt !== "number") {
    patch.lastClaimAt = lastClaimAt;
  }
  if (typeof user.nextDiamondClaimAt !== "number") {
    patch.nextDiamondClaimAt = nextDiamondClaimAt;
  }
  if (typeof user.canClaimDiamond !== "boolean") {
    patch.canClaimDiamond = canClaimDiamond;
  }
  if (typeof user.eliteProUntil !== "number") {
    patch.eliteProUntil = eliteProUntil;
  }
  if (user.proTrialExpiresAt !== null && typeof user.proTrialExpiresAt !== "number") {
    patch.proTrialExpiresAt = proTrialExpiresAt > 0 ? proTrialExpiresAt : null;
  }
  if (eliteProUntil > 0 && eliteProUntil <= now) {
    eliteProUntil = 0;
    patch.eliteProUntil = 0;
  }
  if (proTrialExpiresAt > 0 && proTrialExpiresAt <= now) {
    const hasActivePaidSubscription =
      (subscriptionType === "weekly" || subscriptionType === "yearly")
      && subscriptionEnd > now;
    proTrialExpiresAt = 0;
    patch.proTrialExpiresAt = null;
    patch.proTrialEndedPaywallPending = !hasActivePaidSubscription;
  }

  const activeProTrialExpiresAt = Math.max(proTrialExpiresAt, eliteProUntil);
  const hasActiveProTrial = activeProTrialExpiresAt > now;

  const expired = subscriptionType !== "free" && subscriptionEnd > 0 && now >= subscriptionEnd;
  if (expired) {
    subscriptionType = "free";
    subscriptionEntitlement = "free";
    subscriptionStartedAt = 0;
    subscriptionEnd = 0;
    imageLimit = FREE_IMAGE_LIMIT;
    imageGenerationCount = 0;
    lastResetDate = 0;
    plan = "free";
    patch.subscriptionType = "free";
    patch.subscriptionEntitlement = "free";
    patch.subscriptionStartedAt = 0;
    patch.subscriptionEnd = 0;
    patch.imageLimit = FREE_IMAGE_LIMIT;
    patch.imageGenerationCount = 0;
    patch.lastResetDate = 0;
    patch.plan = "free";
  } else if (subscriptionType === "weekly" || subscriptionType === "yearly") {
    const expectedEntitlement = subscriptionType === "weekly" ? "weekly_pro" : "annual_pro";
    imageLimit = getGenerationLimit(subscriptionType);
    subscriptionStartedAt = getSubscriptionAnchor(user, now);
    if (subscriptionEntitlement !== expectedEntitlement) {
      subscriptionEntitlement = expectedEntitlement;
      patch.subscriptionEntitlement = expectedEntitlement;
    }
    if (toFiniteNumber(user.subscriptionStartedAt) !== subscriptionStartedAt) {
      patch.subscriptionStartedAt = subscriptionStartedAt;
    }
    if (user.imageLimit !== imageLimit) {
      patch.imageLimit = imageLimit;
    }

    const window = resolveSubscriptionWindow(subscriptionType, subscriptionStartedAt, now);
    const nextResetDate = window ? Math.min(window.end, subscriptionEnd || window.end) : 0;
    if (window) {
      const shouldResetCounter = window.start > 0 && Math.abs(lastResetDate - window.start) > 1000;
      lastResetDate = window.start;
      if (shouldResetCounter) {
        imageGenerationCount = 0;
        patch.imageGenerationCount = 0;
      }
      if (toFiniteNumber(user.lastResetDate) !== lastResetDate) {
        patch.lastResetDate = lastResetDate;
      }

      const active = subscriptionEnd > now;
      const remaining = active ? Number.MAX_SAFE_INTEGER : 0;
      const reachedLimit = false;
      const statusLabel =
        plan === "trial"
          ? "Unlimited generations during your active trial"
          : "Unlimited generations";
      const statusMessage = !active
        ? "Plan expired. Upgrade or renew to continue."
        : statusLabel;
      const hasPaidAccess = active && (plan === "pro" || plan === "trial");
      const hasProAccess = hasPaidAccess || hasActiveProTrial;
      if (canClaimDiamond) {
        canClaimDiamond = false;
        patch.canClaimDiamond = false;
      }

      return {
        plan,
        credits,
        diamondBalance,
        premiumCredits,
        subscriptionType,
        subscriptionEntitlement,
        subscriptionStartedAt,
        subscriptionEnd,
        imageLimit,
        imageGenerationCount,
        lastResetDate,
        streakCount,
        lastLoginDate,
        lastClaimDate,
        lastClaimAt,
        nextDiamondClaimAt,
        canClaimDiamond: false,
        eliteProUntil,
        proTrialExpiresAt: proTrialExpiresAt > 0 ? proTrialExpiresAt : null,
        nextResetDate,
        limit: imageLimit,
        remaining,
        active,
        expired,
        reachedLimit,
        blocked: !active || reachedLimit,
        statusLabel,
        statusMessage,
        hasPaidAccess,
        hasProAccess,
        canExport4k: false,
        canRemoveWatermark: hasProAccess,
        canVirtualStage: hasProAccess,
        canEditDesigns: hasProAccess,
        generationPolicy: resolveGenerationPolicy({
          plan,
          hasPaidAccess,
          hasProAccess,
          subscriptionType,
          usesPremiumDiamond: false,
        }),
        patch,
      };
    }
  } else {
    subscriptionEntitlement = "free";
    subscriptionStartedAt = 0;
    imageLimit = FREE_IMAGE_LIMIT;
    if (user.imageLimit !== imageLimit) {
      patch.imageLimit = imageLimit;
    }
    if (user.subscriptionEntitlement !== "free") {
      patch.subscriptionEntitlement = "free";
    }
    if (toFiniteNumber(user.subscriptionStartedAt) !== 0) {
      patch.subscriptionStartedAt = 0;
    }
  }

  const effectiveNextClaimAt = getNextDailyClaimAt(Math.max(lastClaimDate, lastClaimAt), nextDiamondClaimAt);
  if (diamondBalance < FREE_DAILY_DIAMOND_CAP && (effectiveNextClaimAt <= 0 || now >= effectiveNextClaimAt)) {
    canClaimDiamond = true;
    if (user.canClaimDiamond !== true) {
      patch.canClaimDiamond = true;
    }
  } else if (canClaimDiamond) {
    canClaimDiamond = false;
    patch.canClaimDiamond = false;
  }

  const remaining = Math.max(credits, 0);
  premiumCredits = Math.min(premiumCredits, remaining);
  const reachedLimit = remaining <= 0;
  const statusLabel = hasActiveProTrial ? "Unlimited generations during your active trial" : `${remaining} Diamonds left`;
  const statusMessage = hasActiveProTrial
    ? statusLabel
    : reachedLimit
      ? "No Diamonds left. Buy more to continue."
      : statusLabel;
  const hasProAccess = hasActiveProTrial;

  return {
    plan: hasActiveProTrial ? ("trial" as const) : plan,
    credits,
    diamondBalance,
    premiumCredits,
    subscriptionType: "free" as const,
    subscriptionEntitlement: "free" as const,
    subscriptionStartedAt: 0,
    subscriptionEnd: 0,
    imageLimit,
    imageGenerationCount,
    lastResetDate,
    streakCount,
    lastLoginDate,
    lastClaimDate,
    lastClaimAt,
    nextDiamondClaimAt,
    canClaimDiamond,
    eliteProUntil,
    proTrialExpiresAt: proTrialExpiresAt > 0 ? proTrialExpiresAt : null,
    nextResetDate: effectiveNextClaimAt > 0 ? effectiveNextClaimAt : lastResetDate > 0 ? lastResetDate + FREE_REFILL_INTERVAL_MS : now + FREE_REFILL_INTERVAL_MS,
    limit: imageLimit,
    remaining: hasActiveProTrial ? Number.MAX_SAFE_INTEGER : remaining,
    active: hasActiveProTrial,
    expired,
    reachedLimit,
    blocked: hasActiveProTrial ? false : reachedLimit,
    statusLabel,
    statusMessage,
    hasPaidAccess: hasActiveProTrial,
    hasProAccess,
    canExport4k: premiumCredits > 0,
    canRemoveWatermark: hasProAccess,
    canVirtualStage: hasProAccess,
    canEditDesigns: hasProAccess,
    generationPolicy: resolveGenerationPolicy({
      plan: "free",
      hasPaidAccess: hasActiveProTrial,
      hasProAccess,
      subscriptionType: "free",
      usesPremiumDiamond: premiumCredits > 0,
    }),
    patch,
  };
}

export function buildSubscriptionPatch(args: {
  plan: BillingPlan;
  subscriptionType: SubscriptionType;
  subscriptionEntitlement?: SubscriptionEntitlement;
  purchasedAt: number;
  subscriptionEnd?: number | bigint;
  previousSubscriptionType?: string;
  previousSubscriptionEntitlement?: string;
  previousSubscriptionStart?: number | bigint;
}) {
  const nextEntitlement =
    args.subscriptionType === "weekly"
      ? "weekly_pro"
      : args.subscriptionType === "yearly"
        ? "annual_pro"
        : "free";
  const nextEnd =
    args.subscriptionType === "free"
      ? 0
      : args.subscriptionEnd !== undefined && args.subscriptionEnd !== null
        ? toFiniteNumber(args.subscriptionEnd)
        : getSubscriptionEndForType(args.subscriptionType, args.purchasedAt);
  const previousType = normalizeSubscriptionType(args.previousSubscriptionType);
  const previousEntitlement = normalizeSubscriptionEntitlement(args.previousSubscriptionEntitlement);
  const previousStart = toFiniteNumber(args.previousSubscriptionStart);
  const sameWindow =
    previousType === args.subscriptionType
    && previousEntitlement === nextEntitlement
    && previousStart > 0
    && Math.abs(previousStart - args.purchasedAt) < 60 * 60 * 1000;

  if (args.subscriptionType === "free") {
    return {
      plan: "free" as const,
      subscriptionType: "free" as const,
      subscriptionEntitlement: "free" as const,
      subscriptionStartedAt: 0,
      subscriptionEnd: 0,
      imageLimit: FREE_IMAGE_LIMIT,
      imageGenerationCount: 0,
      lastResetDate: 0,
    };
  }

  return {
    plan: args.plan,
    subscriptionType: args.subscriptionType,
    subscriptionEntitlement: args.subscriptionEntitlement ?? nextEntitlement,
    subscriptionStartedAt: args.purchasedAt,
    subscriptionEnd: nextEnd,
    imageLimit: getGenerationLimit(args.subscriptionType),
    imageGenerationCount: sameWindow ? undefined : 0,
    lastResetDate: sameWindow ? undefined : args.purchasedAt,
  };
}
