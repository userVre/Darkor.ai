import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

type Billing = "monthly" | "yearly";
type Tier = "Pro" | "Premium" | "Ultra";
type PurchaseType = "subscription" | "credits";
type CreditsPack = "starter" | "growth" | "scale";

const FIXED_SUBSCRIPTION_PRICE_IDS: Record<Tier, Record<Billing, string>> = {
  Pro: {
    monthly: "e63d860f-e646-4964-a52b-6d19ef5d0551",
    yearly: "94ebd3e5-d8ea-4bab-bb1e-e4288fc0340e",
  },
  Premium: {
    monthly: "b286c1c2-73c8-449f-99aa-1c6a276f5cc2",
    yearly: "6a101e3a-b0e2-4bfa-9695-c4e47f3c90ba",
  },
  Ultra: {
    monthly: "8e5fe8a8-3aa5-4333-96d0-4e8461c9ff2e",
    yearly: "f2652c80-3808-452f-9024-141ac7bc2309",
  },
};

const ALLOWED_SUBSCRIPTION_PRICE_IDS = new Set(
  Object.values(FIXED_SUBSCRIPTION_PRICE_IDS).flatMap((entry) => Object.values(entry)),
);

const CREDIT_PACK_PRICE_IDS: Record<CreditsPack, string | undefined> = {
  starter: process.env.POLAR_PRICE_CREDITS_STARTER,
  growth: process.env.POLAR_PRICE_CREDITS_GROWTH,
  scale: process.env.POLAR_PRICE_CREDITS_SCALE,
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = process.env.POLAR_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "POLAR_ACCESS_TOKEN is missing" }, { status: 500 });
    }

    const body = await req.json();
    const purchaseType = (body?.purchaseType as PurchaseType) ?? "subscription";
    const expectedClerkId = body?.clerkId as string | undefined;

    if (expectedClerkId && expectedClerkId !== userId) {
      return NextResponse.json({ error: "Clerk identity mismatch" }, { status: 403 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    let products: string[] = [];
    let metadata: Record<string, string> = { userId, clerkId: userId };
    let successUrl = `${origin}/dashboard/workspace?checkout=success`;
    let cancelUrl = `${origin}/#pricing`;

    if (purchaseType === "credits") {
      const pack = body?.pack as CreditsPack;
      const packPriceId = pack ? CREDIT_PACK_PRICE_IDS[pack] : undefined;

      if (!pack || !packPriceId) {
        return NextResponse.json(
          { error: "Invalid credits pack. Configure POLAR_PRICE_CREDITS_* env vars." },
          { status: 400 },
        );
      }

      products = [packPriceId];
      metadata = {
        userId,
        clerkId: userId,
        purchaseType,
        creditsPack: pack,
      };
      successUrl = `${origin}/dashboard/billing?checkout=success`;
      cancelUrl = `${origin}/dashboard/billing`;
    } else {
      const planName = body?.planName as Tier | undefined;
      const billing = body?.billing as Billing | undefined;
      const priceId = body?.priceId as string | undefined;

      const resolvedPriceId = priceId ?? (planName && billing ? FIXED_SUBSCRIPTION_PRICE_IDS[planName][billing] : null);

      if (!resolvedPriceId || !ALLOWED_SUBSCRIPTION_PRICE_IDS.has(resolvedPriceId)) {
        return NextResponse.json({ error: "Invalid subscription priceId" }, { status: 400 });
      }

      products = [resolvedPriceId];
      metadata = {
        userId,
        clerkId: userId,
        purchaseType,
        planName: planName ?? "Unknown",
        billing: billing ?? "unknown",
        priceId: resolvedPriceId,
      };
    }

    const polarResponse = await fetch("https://api.polar.sh/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      }),
    });

    const data = await polarResponse.json();
    if (!polarResponse.ok) {
      return NextResponse.json(
        { error: data?.error ?? data?.message ?? "Could not create Polar checkout", details: data },
        { status: 500 },
      );
    }

    const checkoutUrl = data?.url ?? data?.checkout_url ?? data?.data?.url ?? null;
    if (!checkoutUrl) {
      return NextResponse.json({ error: "Polar checkout URL missing", details: data }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
