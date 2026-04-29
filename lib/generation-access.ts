import AsyncStorage from "@react-native-async-storage/async-storage";

export const GENERATION_ACCESS_CACHE_KEY = "homedecor:generation-access";

export type GenerationAccessState = {
  credits?: number | null;
  imagesRemaining?: number | null;
  imageGenerationLimit?: number | null;
  imageGenerationCount?: number | null;
  subscriptionType?: "free" | "weekly" | "yearly" | null;
  subscriptionEntitlement?: "free" | "weekly_pro" | "annual_pro" | null;
  subscriptionStartedAt?: number | null;
  generationResetAt?: number | null;
  generationStatusLabel?: string | null;
  generationStatusMessage?: string | null;
  hasPaidAccess?: boolean | null;
  canGenerateNow?: boolean | null;
  lastRefillTimestamp?: number | null;
  pricingTier?: string | null;
};

export type GenerationAccessDecision = {
  allowed: boolean;
  reason: "ok" | "paywall" | "limit_reached";
  remaining: number;
  hasPaidAccess: boolean;
  message: string;
};

function toSafeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function canUserGenerate(state?: GenerationAccessState | null): GenerationAccessDecision {
  const hasPaidAccess = Boolean(state?.hasPaidAccess);
  if (hasPaidAccess) {
    return {
      allowed: true,
      reason: "ok",
      remaining: Number.MAX_SAFE_INTEGER,
      hasPaidAccess,
      message: String(state?.generationStatusMessage ?? "Unlimited generations").trim() || "Unlimited generations",
    };
  }

  const hasSubscriptionQuota = state?.subscriptionType === "weekly" || state?.subscriptionType === "yearly";
  const remaining =
    typeof state?.imagesRemaining === "number"
      ? Math.max(state.imagesRemaining, 0)
      : Math.max(toSafeNumber(state?.credits), 0);
  const fallbackMessage = hasPaidAccess || hasSubscriptionQuota ? "Limit Reached" : "Free limit reached. Upgrade to continue.";
  const message = String(state?.generationStatusMessage ?? fallbackMessage).trim() || fallbackMessage;

  if (remaining > 0 && state?.canGenerateNow !== false) {
    return {
      allowed: true,
      reason: "ok",
      remaining,
      hasPaidAccess,
      message,
    };
  }

  return {
    allowed: false,
    reason: hasPaidAccess || hasSubscriptionQuota ? "limit_reached" : "paywall",
    remaining,
    hasPaidAccess,
    message,
  };
}

export async function persistGenerationAccessSnapshot(snapshot: GenerationAccessState | null | undefined) {
  if (!snapshot) {
    await AsyncStorage.removeItem(GENERATION_ACCESS_CACHE_KEY);
    return;
  }

  await AsyncStorage.setItem(
    GENERATION_ACCESS_CACHE_KEY,
    JSON.stringify({
      credits: snapshot.credits ?? null,
      imagesRemaining: snapshot.imagesRemaining ?? null,
      imageGenerationLimit: snapshot.imageGenerationLimit ?? null,
      imageGenerationCount: snapshot.imageGenerationCount ?? null,
      subscriptionType: snapshot.subscriptionType ?? "free",
      subscriptionEntitlement: snapshot.subscriptionEntitlement ?? "free",
      subscriptionStartedAt: snapshot.subscriptionStartedAt ?? 0,
      generationResetAt: snapshot.generationResetAt ?? 0,
      generationStatusLabel: snapshot.generationStatusLabel ?? null,
      generationStatusMessage: snapshot.generationStatusMessage ?? null,
      hasPaidAccess: Boolean(snapshot.hasPaidAccess),
      canGenerateNow: snapshot.canGenerateNow ?? null,
      lastRefillTimestamp: snapshot.lastRefillTimestamp ?? 0,
      pricingTier: snapshot.pricingTier ?? null,
      cachedAt: Date.now(),
    }),
  );
}

export async function loadGenerationAccessSnapshot() {
  try {
    const stored = await AsyncStorage.getItem(GENERATION_ACCESS_CACHE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as GenerationAccessState | null;
    return parsed ?? null;
  } catch {
    return null;
  }
}
