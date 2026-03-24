export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
export const YEAR_MS = 365 * DAY_MS;
export const MONTHLY_RESET_MS = 30 * DAY_MS;
export const FREE_IMAGE_LIMIT = 3;
export const WEEKLY_IMAGE_LIMIT = 15;
export const YEARLY_MONTHLY_IMAGE_LIMIT = 60;

export type SubscriptionType = "weekly" | "yearly" | "free";
export type BillingPlan = "free" | "trial" | "pro";

type SubscriptionLikeUser = {
  plan?: string;
  subscriptionType?: string;
  subscriptionEnd?: number;
  credits?: number;
  imageLimit?: number;
  imageGenerationCount?: number;
  lastResetDate?: number;
};

function normalizeSubscriptionType(input?: string | null): SubscriptionType {
  if (input === "weekly" || input === "yearly") {
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

export function deriveSubscriptionState(user: SubscriptionLikeUser, now: number) {
  let plan = normalizePlan(user.plan);
  let subscriptionType = normalizeSubscriptionType(user.subscriptionType);
  let subscriptionEnd = typeof user.subscriptionEnd === "number" ? user.subscriptionEnd : 0;
  let credits = typeof user.credits === "number" ? Math.max(user.credits, 0) : FREE_IMAGE_LIMIT;
  let imageLimit = typeof user.imageLimit === "number" ? user.imageLimit : getGenerationLimit(subscriptionType);
  let imageGenerationCount = typeof user.imageGenerationCount === "number" ? user.imageGenerationCount : 0;
  let lastResetDate = typeof user.lastResetDate === "number" ? user.lastResetDate : 0;

  const patch: Record<string, number | string> = {};

  if (user.subscriptionType !== subscriptionType) {
    patch.subscriptionType = subscriptionType;
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
    subscriptionEnd = 0;
    imageLimit = FREE_IMAGE_LIMIT;
    imageGenerationCount = 0;
    lastResetDate = 0;
    plan = "free";
    patch.subscriptionType = "free";
    patch.subscriptionEnd = 0;
    patch.imageLimit = FREE_IMAGE_LIMIT;
    patch.imageGenerationCount = 0;
    patch.lastResetDate = 0;
    patch.plan = "free";
  } else if (subscriptionType === "yearly") {
    imageLimit = YEARLY_MONTHLY_IMAGE_LIMIT;
    if (user.imageLimit !== imageLimit) {
      patch.imageLimit = imageLimit;
    }
    if (lastResetDate <= 0) {
      lastResetDate = now;
      patch.lastResetDate = now;
    }
    if (now - lastResetDate >= MONTHLY_RESET_MS) {
      imageGenerationCount = 0;
      lastResetDate = now;
      patch.imageGenerationCount = 0;
      patch.lastResetDate = now;
    }
  } else if (subscriptionType === "weekly") {
    imageLimit = WEEKLY_IMAGE_LIMIT;
    if (user.imageLimit !== imageLimit) {
      patch.imageLimit = imageLimit;
    }
    if (lastResetDate <= 0) {
      lastResetDate = now;
      patch.lastResetDate = now;
    }
  } else {
    imageLimit = FREE_IMAGE_LIMIT;
    if (user.imageLimit !== imageLimit) {
      patch.imageLimit = imageLimit;
    }
    if (credits > FREE_IMAGE_LIMIT) {
      credits = FREE_IMAGE_LIMIT;
      patch.credits = FREE_IMAGE_LIMIT;
    }
  }

  const active = subscriptionType !== "free" && subscriptionEnd > now;
  const limit = imageLimit;
  const remaining = subscriptionType === "free"
    ? Math.max(credits, 0)
    : active
      ? Math.max(limit - imageGenerationCount, 0)
      : 0;
  const reachedLimit = subscriptionType === "free"
    ? remaining <= 0
    : active && limit > 0 && imageGenerationCount >= limit;
  const blocked = subscriptionType === "free" ? reachedLimit : !active || reachedLimit;
  const statusLabel = subscriptionType === "weekly"
    ? `${remaining} / ${limit} images left`
    : subscriptionType === "yearly"
      ? `${remaining} / ${limit} this month`
      : `${remaining} / ${FREE_IMAGE_LIMIT} gifts left`;
  const statusMessage = subscriptionType === "free"
    ? reachedLimit
      ? "Free limit reached. Upgrade to continue."
      : statusLabel
    : !active
      ? "Plan expired. Upgrade or renew to continue."
      : reachedLimit
        ? `Limit Reached - ${statusLabel}`
        : statusLabel;
  const hasPaidAccess = active && subscriptionType !== "free";

  return {
    plan,
    credits,
    subscriptionType,
    subscriptionEnd,
    imageLimit,
    imageGenerationCount,
    lastResetDate,
    limit,
    remaining,
    active,
    expired,
    reachedLimit,
    blocked,
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

export function buildSubscriptionPatch(args: {
  plan: BillingPlan;
  subscriptionType: SubscriptionType;
  purchasedAt: number;
  subscriptionEnd?: number;
  previousSubscriptionType?: string;
  previousSubscriptionEnd?: number;
}) {
  const nextEnd = args.subscriptionType === "free"
    ? 0
    : typeof args.subscriptionEnd === "number"
      ? args.subscriptionEnd
      : getSubscriptionEndForType(args.subscriptionType, args.purchasedAt);
  const previousType = normalizeSubscriptionType(args.previousSubscriptionType);
  const previousEnd = typeof args.previousSubscriptionEnd === "number" ? args.previousSubscriptionEnd : 0;
  const sameWindow = previousType === args.subscriptionType && previousEnd > 0 && nextEnd > 0 && Math.abs(previousEnd - nextEnd) < DAY_MS;

  if (args.subscriptionType === "free") {
    return {
      plan: "free" as const,
      subscriptionType: "free" as const,
      subscriptionEnd: 0,
      imageLimit: FREE_IMAGE_LIMIT,
      imageGenerationCount: 0,
      lastResetDate: 0,
    };
  }

  return {
    plan: args.plan,
    subscriptionType: args.subscriptionType,
    subscriptionEnd: nextEnd,
    imageLimit: getGenerationLimit(args.subscriptionType),
    imageGenerationCount: sameWindow ? undefined : 0,
    lastResetDate: sameWindow ? undefined : args.purchasedAt,
  };
}
