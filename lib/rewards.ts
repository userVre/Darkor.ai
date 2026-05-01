const DAILY_REFILL_MS = 24 * 60 * 60 * 1000;

export type RewardStatus = {
  nextEligibleAt: number;
  remainingMs: number;
  daysLeft: number;
  isEligible: boolean;
};

export function getRewardStatus(lastRewardDate?: number | null, now = Date.now()): RewardStatus {
  const last = typeof lastRewardDate === "number" ? lastRewardDate : 0;
  const nextEligibleAt = last > now ? last : last > 0 ? last + DAILY_REFILL_MS : now;
  const remainingMs = Math.max(0, nextEligibleAt - now);
  const daysLeft = remainingMs > 0 ? Math.ceil(remainingMs / (24 * 60 * 60 * 1000)) : 0;
  return {
    nextEligibleAt,
    remainingMs,
    daysLeft,
    isEligible: remainingMs === 0,
  };
}

export function formatRewardCountdown(lastRewardDate?: number | null, now = Date.now()) {
  const status = getRewardStatus(lastRewardDate, now);
  if (status.isEligible) {
    return "Next refill available now";
  }
  if (status.daysLeft === 1) {
    return "Next refill in 1 day";
  }
  return `Next refill in ${status.daysLeft} days`;
}
