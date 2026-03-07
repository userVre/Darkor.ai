import { ConvexHttpClient } from "convex/browser";
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

type Plan = "Pro" | "Premium" | "Ultra";

type ProductMeta = {
  credits: number;
  plan?: Plan;
  description: string;
};

const PRODUCT_CATALOG: Record<string, ProductMeta> = {
  "e63d860f-e646-4964-a52b-6d19ef5d0551": { plan: "Pro", credits: 100, description: "Pro Monthly" },
  "b286c1c2-73c8-449f-99aa-1c6a276f5cc2": { plan: "Premium", credits: 500, description: "Premium Monthly" },
  "8e5fe8a8-3aa5-4333-96d0-4e8461c9ff2e": { plan: "Ultra", credits: 2000, description: "Ultra Monthly" },
  "94ebd3e5-d8ea-4bab-bb1e-e4288fc0340e": { plan: "Pro", credits: 100, description: "Pro Yearly" },
  "6a101e3a-b0e2-4bfa-9695-c4e47f3c90ba": { plan: "Premium", credits: 500, description: "Premium Yearly" },
  "f2652c80-3808-452f-9024-141ac7bc2309": { plan: "Ultra", credits: 2000, description: "Ultra Yearly" },
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

function verifySignature(rawBody: string, signatureHeader: string, secret: string) {
  const provided = signatureHeader.replace(/^sha256=/, "").trim();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  if (provided.length !== expected.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

function pickProductId(data: any): string | null {
  const direct = data?.product_id ?? data?.price_id ?? data?.productId ?? data?.priceId;
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }

  const first = data?.products?.[0] ?? data?.items?.[0] ?? data?.line_items?.[0];
  return first?.product_id ?? first?.price_id ?? null;
}

function pickAmountCents(data: any): number {
  const raw = data?.total_amount ?? data?.amount ?? data?.amount_cents ?? data?.totals?.total ?? 0;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function pickPaidAtMs(data: any): number {
  const candidate = data?.paid_at ?? data?.created_at ?? data?.updated_at ?? data?.processed_at;
  if (typeof candidate === "string") {
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Date.now();
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const secret = process.env.POLAR_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json({ error: "POLAR_WEBHOOK_SECRET is missing" }, { status: 500 });
    }

    const signatureHeader = req.headers.get("polar-signature") || req.headers.get("x-polar-signature");
    if (!signatureHeader || !verifySignature(rawBody, signatureHeader, secret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.type ?? event?.event;

    if (eventType !== "order.created" && eventType !== "subscription.created") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const data = event?.data ?? {};
    const metadata = data?.metadata ?? event?.metadata ?? {};
    const clerkId = metadata?.clerkId ?? metadata?.userId;

    if (!clerkId) {
      return NextResponse.json({ error: "clerkId missing in metadata" }, { status: 400 });
    }

    const productId = pickProductId(data);
    if (!productId || !PRODUCT_CATALOG[productId]) {
      return NextResponse.json({ error: "Unknown product/price id" }, { status: 400 });
    }

    const product = PRODUCT_CATALOG[productId];

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is missing" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);

    await client.mutation("billing:processPolarEvent" as any, {
      eventId: String(event?.id ?? `${eventType}-${data?.id ?? Date.now()}`),
      eventType: String(eventType),
      clerkId,
      plan: product.plan,
      credits: product.credits,
      polarCustomerId: data?.customer_id ?? data?.customer?.id ?? undefined,
      polarOrderId: String(data?.id ?? data?.order_id ?? data?.checkout_id ?? `order-${Date.now()}`),
      amountCents: pickAmountCents(data),
      currency: String(data?.currency ?? "USD").toUpperCase(),
      status: String(data?.status ?? "paid"),
      description: product.description,
      receiptUrl: data?.receipt_url ?? data?.invoice_url ?? undefined,
      invoiceNumber: data?.invoice_number ?? undefined,
      paidAtMs: pickPaidAtMs(data),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

