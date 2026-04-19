export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
export const YEAR_MS = 365 * DAY_MS;
export const MONTHLY_RESET_MS = 30 * DAY_MS;
export const FREE_IMAGE_LIMIT = 3;
export const WEEKLY_IMAGE_LIMIT = Number.MAX_SAFE_INTEGER;
export const YEARLY_MONTHLY_IMAGE_LIMIT = Number.MAX_SAFE_INTEGER;
export const FREE_REFILL_INTERVAL_MS = 72 * 60 * 60 * 1000;

export type SubscriptionType = "weekly" | "yearly" | "free";
export type SubscriptionEntitlement = "weekly_pro" | "annual_pro" | "free";
export type BillingPlan = "free" | "trial" | "pro";

type SubscriptionLikeUser = {
  plan?: string;
  subscriptionType?: string;
  subscriptionEntitlement?: string;
  subscriptionStartedAt?: number | bigint;
  subscriptionEnd?: number | bigint;
  credits?: number | bigint;
  imageLimit?: number | bigint;
  imageGenerationCount?: number | bigint;
  lastResetDate?: number | bigint;
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
      message: state.remaining <= 0 ? "Free limit reached. Upgrade to continue." : state.statusMessage,
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

export function deriveSubscriptionState(user: SubscriptionLikeUser, now: number) {
  let plan = normalizePlan(user.plan);
  let subscriptionType = normalizeSubscriptionType(user.subscriptionType);
  let subscriptionEntitlement = normalizeSubscriptionEntitlement(user.subscriptionEntitlement);
  let subscriptionStartedAt = getSubscriptionAnchor(user, now);
  let subscriptionEnd = toFiniteNumber(user.subscriptionEnd);
  let credits = Math.max(toFiniteNumber(user.credits, FREE_IMAGE_LIMIT), 0);
  let imageLimit = toFiniteNumber(user.imageLimit, getGenerationLimit(subscriptionType));
  let imageGenerationCount = toFiniteNumber(user.imageGenerationCount);
  let lastResetDate = toFiniteNumber(user.lastResetDate);

  const patch: Record<string, number | string> = {};

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
  if (typeof user.imageLimit !== "number") {
    patch.imageLimit = imageLimit;
  }
  if (typeof user.imageGenerationCount !== "number") {
    patch.imageGenerationCount = imageGenerationCount;
  }
  if (typeof user.lastResetDate !== "number") {
    patch.lastResetDate = lastResetDate;
  }

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

      return {
        plan,
        credits,
        subscriptionType,
        subscriptionEntitlement,
        subscriptionStartedAt,
        subscriptionEnd,
        imageLimit,
        imageGenerationCount,
        lastResetDate,
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
        canExport4k: hasPaidAccess,
        canRemoveWatermark: hasPaidAccess,
        canVirtualStage: hasPaidAccess,
        canEditDesigns: hasPaidAccess,
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
    if (credits > FREE_IMAGE_LIMIT) {
      credits = FREE_IMAGE_LIMIT;
      patch.credits = FREE_IMAGE_LIMIT;
    }
  }

  const refillEligible = credits < FREE_IMAGE_LIMIT && (lastResetDate <= 0 || now - lastResetDate >= FREE_REFILL_INTERVAL_MS);
  if (refillEligible) {
    credits = FREE_IMAGE_LIMIT;
    lastResetDate = now;
    patch.credits = FREE_IMAGE_LIMIT;
    patch.lastResetDate = now;
  }

  const remaining = Math.max(credits, 0);
  const reachedLimit = remaining <= 0;
  const statusLabel = `${remaining} / ${FREE_IMAGE_LIMIT} Diamonds left`;
  const statusMessage = reachedLimit ? "Free limit reached. Upgrade to continue." : statusLabel;

  return {
    plan,
    credits,
    subscriptionType: "free" as const,
    subscriptionEntitlement: "free" as const,
    subscriptionStartedAt: 0,
    subscriptionEnd: 0,
    imageLimit,
    imageGenerationCount,
    lastResetDate,
    nextResetDate: lastResetDate > 0 ? lastResetDate + FREE_REFILL_INTERVAL_MS : now + FREE_REFILL_INTERVAL_MS,
    limit: imageLimit,
    remaining,
    active: false,
    expired,
    reachedLimit,
    blocked: reachedLimit,
    statusLabel,
    statusMessage,
    hasPaidAccess: false,
    canExport4k: false,
    canRemoveWatermark: false,
    canVirtualStage: false,
    canEditDesigns: false,
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
