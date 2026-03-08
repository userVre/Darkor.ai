import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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

    const origin = req.nextUrl.origin;
    const returnUrl = `${origin}/dashboard/billing`;

    const payload = {
      external_customer_id: userId,
      return_url: returnUrl,
    };

    const response = await fetch("https://api.polar.sh/v1/customer-sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error ?? data?.message ?? "Could not create customer portal session", details: data },
        { status: 500 },
      );
    }

    const portalUrl = data?.url ?? data?.customer_portal_url ?? data?.data?.url ?? null;
    if (!portalUrl) {
      return NextResponse.json({ error: "Polar portal URL missing", details: data }, { status: 500 });
    }

    return NextResponse.json({ portalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
