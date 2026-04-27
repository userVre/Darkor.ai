import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const numberLike = v.union(v.number(), v.int64());
const optionalNumberLike = v.optional(numberLike);

export default defineSchema({
  users: defineTable({
    clerkId: v.optional(v.string()),
    anonymousId: v.optional(v.string()),
    mergedIntoClerkId: v.optional(v.string()),
    credits: numberLike,
    plan: v.string(),
    generationCount: numberLike,
    reviewPrompted: v.boolean(),
    lastReviewPromptAt: optionalNumberLike,
    lastRewardDate: optionalNumberLike,
    referralCode: v.optional(v.string()),
    referralCount: optionalNumberLike,
    referredBy: v.optional(v.string()),
    subscriptionType: v.optional(v.union(v.literal("weekly"), v.literal("yearly"), v.literal("free"))),
    subscriptionEntitlement: v.optional(v.union(v.literal("weekly_pro"), v.literal("annual_pro"), v.literal("free"))),
    subscriptionStartedAt: optionalNumberLike,
    subscriptionEnd: optionalNumberLike,
    imageLimit: optionalNumberLike,
    imageGenerationCount: optionalNumberLike,
    lastResetDate: optionalNumberLike,
    pricingTier: v.optional(v.string()),
    pricingCountryCode: v.optional(v.string()),
    pricingCurrencyCode: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_anonymousId", ["anonymousId"]),

  generations: defineTable({
    userId: v.string(),
    sourceImageStorageId: v.optional(v.id("_storage")),
    referenceImageStorageIds: v.optional(v.array(v.id("_storage"))),
    maskImageStorageId: v.optional(v.id("_storage")),
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    watermarkRequired: v.optional(v.boolean()),
    prompt: v.optional(v.string()),
    style: v.optional(v.string()),
    styleSelections: v.optional(v.array(v.string())),
    roomType: v.optional(v.string()),
    customPrompt: v.optional(v.string()),
    colorPalette: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    serviceType: v.optional(v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign"), v.literal("layout"))),
    modeId: v.optional(v.string()),
    paletteId: v.optional(v.string()),
    finishId: v.optional(v.string()),
    aiSuggestedStyle: v.optional(v.string()),
    aiSuggestedPaletteId: v.optional(v.string()),
    smartSuggest: v.optional(v.boolean()),
    mode: v.optional(v.string()),
    qualityTier: v.optional(v.union(v.literal("free"), v.literal("pro"))),
    outputResolution: v.optional(v.string()),
    speedTier: v.optional(v.union(v.literal("standard"), v.literal("pro"), v.literal("ultra"))),
    status: v.optional(v.union(v.literal("processing"), v.literal("ready"), v.literal("failed"))),
    errorMessage: v.optional(v.string()),
    planUsed: v.string(),
    createdAt: optionalNumberLike,
    completedAt: optionalNumberLike,
    isFavorite: v.optional(v.boolean()),
    feedback: v.optional(v.string()),
    feedbackReason: v.optional(v.string()),
    retryGranted: v.optional(v.boolean()),
    projectId: v.optional(v.id("projects")),
  }).index("by_userId", ["userId"]),

  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: numberLike,
  }).index("by_userId", ["userId"]),

  feedback: defineTable({
    userId: v.string(),
    kind: v.optional(v.union(v.literal("message"), v.literal("generation_review"))),
    message: v.optional(v.string()),
    generationId: v.optional(v.id("generations")),
    imageId: v.optional(v.id("generations")),
    sentiment: v.optional(v.union(v.literal("liked"), v.literal("disliked"))),
    isLike: v.optional(v.boolean()),
    styleSelected: v.optional(v.string()),
    serviceType: v.optional(v.string()),
    roomLabel: v.optional(v.string()),
    source: v.optional(v.string()),
    createdAt: numberLike,
    generationCount: optionalNumberLike,
  })
    .index("by_userId", ["userId"])
    .index("by_generationId", ["generationId"]),
});
