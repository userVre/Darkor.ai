import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

type Plan = "pro" | "premium" | "ultra";

type ProductMeta = {
  credits: number;
  plan?: Plan;
  description: string;
};

const PLAN_CREDITS: Record<Plan, number> = {
  pro: 100,
  premium: 500,
  ultra: 2000,
};

const ID_TO_PLAN: Record<string, Plan> = {
  "e63d860f-e646-4964-a52b-6d19ef5d0551": "pro",
  "b286c1c2-73c8-449f-99aa-1c6a276f5cc2": "premium",
  "8e5fe8a8-3aa5-4333-96d0-4e8461c9ff2e": "ultra",
  "94ebd3e5-d8ea-4bab-bb1e-e4288fc0340e": "pro",
  "6a101e3a-b0e2-4bfa-9695-c4e47f3c90ba": "premium",
  "f2652c80-3808-452f-9024-141ac7bc2309": "ultra",
};

const PRODUCT_CATALOG: Record<string, ProductMeta> = {
  ...Object.fromEntries(
    Object.entries(ID_TO_PLAN).map(([id, plan]) => [
      id,
      {
        plan,
        credits: PLAN_CREDITS[plan],
        description: `${plan[0].toUpperCase()}${plan.slice(1)} Plan`,
      },
    ]),
  ),
  ...(process.env.POLAR_PRICE_CREDITS_STARTER
    ? {
        [process.env.POLAR_PRICE_CREDITS_STARTER]: {
          credits: Number(process.env.POLAR_CREDITS_STARTER_AMOUNT ?? 50),
          description: "Starter Credits",
        },
      }
    : {}),
  ...(process.env.POLAR_PRICE_CREDITS_GROWTH
    ? {
        [process.env.POLAR_PRICE_CREDITS_GROWTH]: {
          credits: Number(process.env.POLAR_CREDITS_GROWTH_AMOUNT ?? 150),
          description: "Growth Credits",
        },
      }
    : {}),
  ...(process.env.POLAR_PRICE_CREDITS_SCALE
    ? {
        [process.env.POLAR_PRICE_CREDITS_SCALE]: {
          credits: Number(process.env.POLAR_CREDITS_SCALE_AMOUNT ?? 400),
          description: "Scale Credits",
        },
      }
    : {}),
};

function pickPaidAtMs(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Date.now();
}

function normalizePlan(value: unknown): Plan | null {
  if (typeof value !== "string") return null;
  const lowered = value.toLowerCase();
  if (lowered === "pro" || lowered === "premium" || lowered === "ultra") {
    return lowered;
  }
  return null;
}

function resolveCatalogFromOrderData(data: any): ProductMeta | null {
  const productId =
    data?.productId ??
    data?.product?.id ??
    data?.items?.[0]?.productPriceId ??
    data?.items?.[0]?.product?.id ??
    data?.subscription?.productId ??
    null;

  if (typeof productId === "string" && PRODUCT_CATALOG[productId]) {
    return PRODUCT_CATALOG[productId];
  }

  return null;
}

function toHeaderRecord(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.POLAR_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "POLAR_WEBHOOK_SECRET is missing" }, { status: 500 });
    }

    const rawBody = await req.text();

    let event: any;
    try {
      event = validateEvent(rawBody, toHeaderRecord(req), secret);
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
      throw error;
    }

    if (event?.type !== "order.created") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const data = event?.data;
    const metadata = data?.metadata ?? {};
    const userId = metadata?.userId ?? metadata?.clerkId;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId missing in checkout metadata" }, { status: 400 });
    }

    const planFromMetadata = normalizePlan(metadata?.plan);
    const catalog = resolveCatalogFromOrderData(data);
    const resolvedPlan = planFromMetadata ?? catalog?.plan ?? null;

    if (!resolvedPlan && !catalog) {
      return NextResponse.json({ error: "Could not resolve purchased plan/product" }, { status: 400 });
    }

    const credits = resolvedPlan ? PLAN_CREDITS[resolvedPlan] : catalog?.credits ?? 0;
    if (!Number.isFinite(credits) || credits <= 0) {
      return NextResponse.json({ error: "Resolved credits are invalid" }, { status: 400 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is missing" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);

    await client.mutation("billing:processPolarEvent" as any, {
      eventId: String(data?.id ?? `${event?.type}-${Date.now()}`),
      eventType: String(event?.type),
      clerkId: userId,
      plan: resolvedPlan ?? undefined,
      credits,
      polarCustomerId: data?.customerId ?? data?.customer?.id ?? undefined,
      polarOrderId: String(data?.id ?? `order-${Date.now()}`),
      amountCents: Number(data?.totalAmount ?? 0),
      currency: String(data?.currency ?? "USD").toUpperCase(),
      status: String(data?.status ?? "paid"),
      description: data?.description ?? catalog?.description,
      receiptUrl: data?.receiptUrl ?? data?.invoiceUrl ?? undefined,
      invoiceNumber: data?.invoiceNumber ?? undefined,
      paidAtMs: pickPaidAtMs(data?.createdAt ?? event?.timestamp),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

