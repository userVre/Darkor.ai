import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  generations: defineTable({
    userId: v.string(),
    imageUrl: v.string(),
    prompt: v.optional(v.string()),
    style: v.optional(v.string()),
    planUsed: v.string(),
  }).index("by_userId", ["userId"]),
});
