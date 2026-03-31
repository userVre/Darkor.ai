import { ConvexError } from "convex/values";

import { FREE_IMAGE_LIMIT } from "./subscriptions";

export const GUEST_STARTER_CREDITS = 3;

export function normalizeAnonymousId(value?: string | null) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function toGuestUserId(anonymousId: string) {
  return `guest:${anonymousId}`;
}

export function buildDefaultUserFields(args: {
  clerkId?: string;
  anonymousId?: string;
  credits?: number;
  generationCount?: number;
  referralCode?: string;
}) {
  const now = Date.now();
  const guestId = args.anonymousId ? toGuestUserId(args.anonymousId) : undefined;

  return {
    clerkId: args.clerkId,
    anonymousId: args.anonymousId,
    mergedIntoClerkId: undefined,
    credits: args.credits ?? GUEST_STARTER_CREDITS,
    plan: "free",
    generationCount: args.generationCount ?? 0,
    reviewPrompted: false,
    lastReviewPromptAt: 0,
    lastRewardDate: now,
    referralCode: args.referralCode ?? args.clerkId ?? guestId ?? `guest-${now}`,
    referralCount: 0,
    referredBy: undefined,
    subscriptionType: "free" as const,
    subscriptionEntitlement: "free" as const,
    subscriptionStartedAt: 0,
    subscriptionEnd: 0,
    imageLimit: FREE_IMAGE_LIMIT,
    imageGenerationCount: 0,
    lastResetDate: 0,
  };
}

export async function getUserByClerkId(ctx: any, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", clerkId))
    .unique();
}

export async function getUserByAnonymousId(ctx: any, anonymousId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_anonymousId", (q: any) => q.eq("anonymousId", anonymousId))
    .unique();
}

export async function ensureGuestUser(ctx: any, anonymousId: string) {
  const normalizedAnonymousId = normalizeAnonymousId(anonymousId);
  if (!normalizedAnonymousId) {
    throw new ConvexError("Missing anonymous guest session.");
  }

  const existing = await getUserByAnonymousId(ctx, normalizedAnonymousId);
  if (existing) {
    return existing;
  }

  const id = await ctx.db.insert(
    "users",
    buildDefaultUserFields({
      anonymousId: normalizedAnonymousId,
      referralCode: toGuestUserId(normalizedAnonymousId),
    }),
  );

  return await ctx.db.get(id);
}

export async function transferOwnedDocuments(ctx: any, fromUserId: string, toUserId: string) {
  if (!fromUserId || fromUserId === toUserId) {
    return;
  }

  const generations = await ctx.db
    .query("generations")
    .withIndex("by_userId", (q: any) => q.eq("userId", fromUserId))
    .collect();

  for (const generation of generations) {
    await ctx.db.patch(generation._id, { userId: toUserId });
  }

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_userId", (q: any) => q.eq("userId", fromUserId))
    .collect();

  for (const project of projects) {
    await ctx.db.patch(project._id, { userId: toUserId });
  }

  const feedbackItems = await ctx.db
    .query("feedback")
    .withIndex("by_userId", (q: any) => q.eq("userId", fromUserId))
    .collect();

  for (const feedback of feedbackItems) {
    await ctx.db.patch(feedback._id, { userId: toUserId });
  }
}

export async function resolveViewer(
  ctx: any,
  args: {
    anonymousId?: string | null;
    createGuest?: boolean;
    requireViewer?: boolean;
  } = {},
) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await getUserByClerkId(ctx, identity.subject);
    return {
      kind: "account" as const,
      clerkId: identity.subject,
      anonymousId: normalizeAnonymousId(args.anonymousId),
      userId: identity.subject,
      user,
    };
  }

  const anonymousId = normalizeAnonymousId(args.anonymousId);
  if (!anonymousId) {
    if (args.requireViewer === false) {
      return null;
    }
    throw new ConvexError("Missing anonymous guest session.");
  }

  const user = args.createGuest === false ? await getUserByAnonymousId(ctx, anonymousId) : await ensureGuestUser(ctx, anonymousId);

  if (!user && args.requireViewer !== false) {
    throw new ConvexError("Guest profile not found.");
  }

  return {
    kind: "guest" as const,
    anonymousId,
    userId: toGuestUserId(anonymousId),
    user,
  };
}
