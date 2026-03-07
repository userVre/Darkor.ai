import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

type Billing = "monthly" | "yearly";
type Tier = "Pro" | "Premium" | "Ultra";

const PRICE_IDS: Record<Billing, Record<Tier, string>> = {
  monthly: {
    Pro: process.env.POLAR_PRICE_PRO_MONTHLY ?? "e63d860f-e646-4964-a52b-6d19ef5d0551",
    Premium: process.env.POLAR_PRICE_PREMIUM_MONTHLY ?? "b286c1c2-73c8-449f-99aa-1c6a276f5cc2",
    Ultra: process.env.POLAR_PRICE_ULTRA_MONTHLY ?? "8e5fe8a8-3aa5-4333-96d0-4e8461c9ff2e",
  },
  yearly: {
    Pro: process.env.POLAR_PRICE_PRO_YEARLY ?? "94ebd3e5-d8ea-4bab-bb1e-e4288fc0340e",
    Premium: process.env.POLAR_PRICE_PREMIUM_YEARLY ?? "6a101e3a-b0e2-4bfa-9695-c4e47f3c90ba",
    Ultra: process.env.POLAR_PRICE_ULTRA_YEARLY ?? "f2652c80-3808-452f-9024-141ac7bc2309",
  },
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
    const tier = body?.tier as Tier;
    const billing = body?.billing as Billing;

    if (!tier || !billing || !PRICE_IDS[billing]?.[tier]) {
      return NextResponse.json({ error: "Invalid tier or billing" }, { status: 400 });
    }

    const priceId = PRICE_IDS[billing][tier];
    const origin = req.nextUrl.origin;

    const polarBody = {
      products: [priceId],
      success_url: `${origin}/dashboard/workspace?checkout=success`,
      cancel_url: `${origin}/#pricing`,
      metadata: {
        clerkId: userId,
        plan: tier,
        billing,
      },
    };

    const polarResponse = await fetch("https://api.polar.sh/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(polarBody),
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
