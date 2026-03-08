import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

export const getMyInvoices = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const rows = await ctx.db
      .query("billingInvoices")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    return rows.sort((a, b) => b.paidAtMs - a.paidAtMs);
  },
});

export const processPolarEvent = mutationGeneric({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    clerkId: v.string(),
    plan: v.optional(v.string()),
    credits: v.int64(),
    polarCustomerId: v.optional(v.string()),
    polarOrderId: v.string(),
    amountCents: v.int64(),
    currency: v.string(),
    status: v.string(),
    description: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    paidAtMs: v.int64(),
  },
  handler: async (ctx, args) => {
    const alreadyProcessed = await ctx.db
      .query("billingEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();

    if (alreadyProcessed) {
      return { ok: true, duplicate: true };
    }

    const existingInvoice = await ctx.db
      .query("billingInvoices")
      .withIndex("by_polarOrderId", (q) => q.eq("polarOrderId", args.polarOrderId))
      .unique();

    const shouldGrantCredits = !existingInvoice;

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        credits: shouldGrantCredits ? existingUser.credits + args.credits : existingUser.credits,
        plan: args.plan ?? existingUser.plan,
        polarCustomerId: args.polarCustomerId ?? existingUser.polarCustomerId,
      });
    } else {
      await ctx.db.insert("users", {
        clerkId: args.clerkId,
        credits: shouldGrantCredits ? args.credits : 0,
        plan: args.plan ?? "free",
        polarCustomerId: args.polarCustomerId,
      });
    }

    if (existingInvoice) {
      await ctx.db.patch(existingInvoice._id, {
        amountCents: args.amountCents,
        currency: args.currency,
        status: args.status,
        description: args.description,
        receiptUrl: args.receiptUrl,
        invoiceNumber: args.invoiceNumber,
        paidAtMs: args.paidAtMs,
      });
    } else {
      await ctx.db.insert("billingInvoices", {
        userId: args.clerkId,
        polarOrderId: args.polarOrderId,
        amountCents: args.amountCents,
        currency: args.currency,
        status: args.status,
        description: args.description,
        receiptUrl: args.receiptUrl,
        invoiceNumber: args.invoiceNumber,
        paidAtMs: args.paidAtMs,
      });
    }

    await ctx.db.insert("billingEvents", {
      eventId: args.eventId,
      clerkId: args.clerkId,
      eventType: args.eventType,
      processedAtMs: Date.now(),
    });

    return { ok: true, duplicate: false, grantedCredits: shouldGrantCredits };
  },
});
