import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    credits: v.int64(),
    plan: v.string(),
    polarCustomerId: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_polarCustomerId", ["polarCustomerId"]),

  generations: defineTable({
    userId: v.string(),
    imageUrl: v.string(),
    prompt: v.optional(v.string()),
    style: v.optional(v.string()),
    planUsed: v.string(),
  }).index("by_userId", ["userId"]),
});
