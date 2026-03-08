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
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    prompt: v.optional(v.string()),
    style: v.optional(v.string()),
    planUsed: v.string(),
  }).index("by_userId", ["userId"]),

  billingInvoices: defineTable({
    userId: v.string(),
    polarOrderId: v.string(),
    amountCents: v.int64(),
    currency: v.string(),
    status: v.string(),
    description: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    paidAtMs: v.int64(),
  })
    .index("by_userId", ["userId"])
    .index("by_polarOrderId", ["polarOrderId"]),

  billingEvents: defineTable({
    eventId: v.string(),
    clerkId: v.string(),
    eventType: v.string(),
    processedAtMs: v.int64(),
  }).index("by_eventId", ["eventId"]),
});
