import { ConvexHttpClient } from "convex/browser";
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

type Plan = "Pro" | "Premium" | "Ultra";

const PRODUCT_TO_PLAN: Record<string, { plan: Plan; credits: number }> = {
  "e63d860f-e646-4964-a52b-6d19ef5d0551": { plan: "Pro", credits: 100 },
  "b286c1c2-73c8-449f-99aa-1c6a276f5cc2": { plan: "Premium", credits: 500 },
  "8e5fe8a8-3aa5-4333-96d0-4e8461c9ff2e": { plan: "Ultra", credits: 2000 },
  "94ebd3e5-d8ea-4bab-bb1e-e4288fc0340e": { plan: "Pro", credits: 100 },
  "6a101e3a-b0e2-4bfa-9695-c4e47f3c90ba": { plan: "Premium", credits: 500 },
  "f2652c80-3808-452f-9024-141ac7bc2309": { plan: "Ultra", credits: 2000 },
};

function verifySignature(rawBody: string, signatureHeader: string, secret: string) {
  const provided = signatureHeader.replace(/^sha256=/, "");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const secret = process.env.POLAR_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json({ error: "POLAR_WEBHOOK_SECRET is missing" }, { status: 500 });
    }

    const signatureHeader =
      req.headers.get("polar-signature") ||
      req.headers.get("x-polar-signature") ||
      req.headers.get("svix-signature");

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
    if (!productId || !PRODUCT_TO_PLAN[productId]) {
      return NextResponse.json({ error: "Unknown product/price id" }, { status: 400 });
    }

    const match = PRODUCT_TO_PLAN[productId];

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is missing" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);
    await client.mutation("users:applyPolarCredits" as any, {
      clerkId,
      plan: match.plan,
      credits: match.credits,
      polarCustomerId:
        data?.customer_id ?? data?.customerId ?? data?.customer?.id ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
