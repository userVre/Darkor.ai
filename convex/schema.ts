import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    credits: v.int64(),
    plan: v.string(),
    generationCount: v.int64(),
    reviewPrompted: v.boolean(),
    lastReviewPromptAt: v.optional(v.int64()),
    lastRewardDate: v.optional(v.int64()),
    referralCode: v.optional(v.string()),
    referralCount: v.optional(v.int64()),
    referredBy: v.optional(v.string()),
  }).index("by_clerkId", ["clerkId"]),

  generations: defineTable({
    userId: v.string(),
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    prompt: v.optional(v.string()),
    style: v.optional(v.string()),
    planUsed: v.string(),
    createdAt: v.optional(v.int64()),
    isFavorite: v.optional(v.boolean()),
    feedback: v.optional(v.string()),
    feedbackReason: v.optional(v.string()),
    retryGranted: v.optional(v.boolean()),
    projectId: v.optional(v.id("projects")),
  }).index("by_userId", ["userId"]),

  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.int64(),
  }).index("by_userId", ["userId"]),

  feedback: defineTable({
    userId: v.string(),
    message: v.string(),
    createdAt: v.int64(),
    generationCount: v.optional(v.int64()),
  }).index("by_userId", ["userId"]),
});
