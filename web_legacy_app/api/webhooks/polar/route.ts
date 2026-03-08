import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

type Plan = "pro" | "premium" | "ultra";
type SupportedEvent = "order.created" | "subscription.created";

type JsonRecord = Record<string, unknown>;

const PLAN_CREDITS: Record<Plan, number> = {
  pro: 100,
  premium: 500,
  ultra: 2000,
};

const PRICE_ID_TO_PLAN: Record<string, Plan> = {
  "e63d860f-e646-4964-a52b-6d19ef5d0551": "pro",
  "94ebd3e5-d8ea-4bab-bb1e-e4288fc0340e": "pro",
  "b286c1c2-73c8-449f-99aa-1c6a276f5cc2": "premium",
  "6a101e3a-b0e2-4bfa-9695-c4e47f3c90ba": "premium",
  "8e5fe8a8-3aa5-4333-96d0-4e8461c9ff2e": "ultra",
  "f2652c80-3808-452f-9024-141ac7bc2309": "ultra",
};

function toRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as JsonRecord;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizePlan(value: unknown): Plan | null {
  const raw = getString(value)?.toLowerCase();
  if (raw === "pro" || raw === "premium" || raw === "ultra") {
    return raw;
  }
  return null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const next = getString(value);
    if (next) return next;
  }
  return null;
}

function pickPaidAtMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  const raw = getString(value);
  if (raw) {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function headersToObject(req: NextRequest): Record<string, string> {
  const output: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}

function resolveWebhookPayload(eventData: unknown) {
  const data = toRecord(eventData);
  const metadata = toRecord(data.metadata);
  const checkout = toRecord(data.checkout);
  const checkoutMetadata = toRecord(checkout.metadata);
  const items = Array.isArray(data.items) ? data.items.map(toRecord) : [];

  const clerkId = firstString(
    metadata.clerkId,
    metadata.userId,
    checkoutMetadata.clerkId,
    checkoutMetadata.userId,
  );

  const planFromMetadata = normalizePlan(
    metadata.planName ?? metadata.plan ?? checkoutMetadata.planName ?? checkoutMetadata.plan,
  );

  const firstPriceId = firstString(
    metadata.priceId,
    checkoutMetadata.priceId,
    data.productPriceId,
    data.productId,
    checkout.productPriceId,
    checkout.productId,
    items[0]?.productPriceId,
    items[0]?.productId,
  );

  const planFromPrice = firstPriceId ? PRICE_ID_TO_PLAN[firstPriceId] ?? null : null;
  const plan = planFromMetadata ?? planFromPrice;

  const eventId =
    firstString(data.id, data.eventId, data.orderId, data.subscriptionId) ?? `polar-event-${Date.now()}`;

  const polarOrderId =
    firstString(data.orderId, toRecord(data.order).id, data.id, data.subscriptionId) ?? `polar-order-${Date.now()}`;

  return {
    clerkId,
    plan,
    credits: plan ? PLAN_CREDITS[plan] : null,
    eventId,
    polarOrderId,
    polarCustomerId: firstString(data.customerId, toRecord(data.customer).id),
    amountCents: Number(data.totalAmount ?? data.amount ?? 0),
    currency: (firstString(data.currency) ?? "USD").toUpperCase(),
    status: firstString(data.status) ?? "paid",
    description: firstString(data.description),
    receiptUrl: firstString(data.receiptUrl, data.invoiceUrl),
    invoiceNumber: firstString(data.invoiceNumber),
    paidAtMs: pickPaidAtMs(data.createdAt),
  };
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "POLAR_WEBHOOK_SECRET is missing" }, { status: 500 });
    }

    const rawBody = await req.text();

    let event: JsonRecord;
    try {
      event = validateEvent(rawBody, headersToObject(req), webhookSecret) as unknown as JsonRecord;
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
      throw error;
    }

    const eventType = getString(event.type);
    if (eventType !== "order.created" && eventType !== "subscription.created") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payload = resolveWebhookPayload(event.data);

    if (!payload.clerkId) {
      return NextResponse.json({ error: "clerkId/userId missing in Polar metadata" }, { status: 400 });
    }

    if (!payload.plan || !payload.credits) {
      return NextResponse.json({ error: "Could not resolve plan from Polar event" }, { status: 400 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is missing" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const convexMutation = client.mutation as unknown as (name: string, args: Record<string, unknown>) => Promise<unknown>;
    await convexMutation("billing:processPolarEvent", {
      eventId: payload.eventId,
      eventType: eventType as SupportedEvent,
      clerkId: payload.clerkId,
      plan: payload.plan,
      credits: payload.credits,
      polarCustomerId: payload.polarCustomerId ?? undefined,
      polarOrderId: payload.polarOrderId,
      amountCents: payload.amountCents,
      currency: payload.currency,
      status: payload.status,
      description: payload.description ?? undefined,
      receiptUrl: payload.receiptUrl ?? undefined,
      invoiceNumber: payload.invoiceNumber ?? undefined,
      paidAtMs: payload.paidAtMs,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



