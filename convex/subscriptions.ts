export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
export const YEAR_MS = 365 * DAY_MS;
export const MONTHLY_RESET_MS = 30 * DAY_MS;
export const WEEKLY_IMAGE_LIMIT = 15;
export const YEARLY_MONTHLY_IMAGE_LIMIT = 60;

export type SubscriptionType = "weekly" | "yearly" | "free";
export type BillingPlan = "free" | "trial" | "pro";

type SubscriptionLikeUser = {
  plan?: string;
  subscriptionType?: string;
  subscriptionEnd?: number;
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
  if (subscriptionType === "weekly") return WEEKLY_IMAGE_LIMIT;
  if (subscriptionType === "yearly") return YEARLY_MONTHLY_IMAGE_LIMIT;
  return 0;
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
  let imageGenerationCount = typeof user.imageGenerationCount === "number" ? user.imageGenerationCount : 0;
  let lastResetDate = typeof user.lastResetDate === "number" ? user.lastResetDate : 0;

  const patch: Record<string, number | string> = {};

  if (user.subscriptionType !== subscriptionType) {
    patch.subscriptionType = subscriptionType;
  }
  if (typeof user.subscriptionEnd !== "number") {
    patch.subscriptionEnd = subscriptionEnd;
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
    imageGenerationCount = 0;
    lastResetDate = 0;
    plan = "free";
    patch.subscriptionType = "free";
    patch.subscriptionEnd = 0;
    patch.imageGenerationCount = 0;
    patch.lastResetDate = 0;
    patch.plan = "free";
  } else if (subscriptionType === "yearly") {
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
  } else if (subscriptionType === "weekly" && lastResetDate <= 0) {
    lastResetDate = now;
    patch.lastResetDate = now;
  }

  const active = subscriptionType !== "free" && subscriptionEnd > now;
  const limit = getGenerationLimit(subscriptionType);
  const remaining = active ? Math.max(limit - imageGenerationCount, 0) : 0;
  const reachedLimit = active && limit > 0 && imageGenerationCount >= limit;
  const blocked = !active || reachedLimit;
  const statusLabel = subscriptionType === "weekly"
    ? `${remaining} / ${limit} images left`
    : subscriptionType === "yearly"
      ? `${remaining} / ${limit} this month`
      : "0 / 0 images left";
  const statusMessage = !active
    ? "Limit Reached - Upgrade or Wait"
    : reachedLimit
      ? `Limit Reached - ${statusLabel}`
      : statusLabel;

  return {
    plan,
    subscriptionType,
    subscriptionEnd,
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
      imageGenerationCount: 0,
      lastResetDate: 0,
    };
  }

  return {
    plan: args.plan,
    subscriptionType: args.subscriptionType,
    subscriptionEnd: nextEnd,
    imageGenerationCount: sameWindow ? undefined : 0,
    lastResetDate: sameWindow ? undefined : args.purchasedAt,
  };
}
