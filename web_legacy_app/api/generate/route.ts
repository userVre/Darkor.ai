import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";

type PlanUsed = "pro" | "premium" | "ultra";

type GeneratePayload = {
  imageBase64?: string;
  imageUrl?: string;
  prompt?: string;
  style?: string;
  planUsed?: PlanUsed;
};

type GeminiInlineData = {
  data?: string;
  mimeType?: string;
  mime_type?: string;
};

type GeminiPart = {
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
};

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-image-preview";

function stripBase64Prefix(value: string) {
  const marker = "base64,";
  const markerIndex = value.indexOf(marker);
  if (markerIndex === -1) return value;
  return value.slice(markerIndex + marker.length);
}

function planPromptSuffix(plan: PlanUsed) {
  if (plan === "pro") {
    return ", high quality interior redesign, realistic lighting";
  }
  if (plan === "premium") {
    return ", photorealistic premium interior redesign, realistic materials, cinematic lighting";
  }
  return ", ultra photorealistic 8k interior redesign, hyper detailed materials, cinematic ray traced lighting";
}

function extractGeneratedImage(response: unknown): { base64: string; mimeType: string } | null {
  const root = response as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  };

  const parts = root?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    const inline = part?.inlineData ?? part?.inline_data;
    const base64 = inline?.data;
    const mimeType = inline?.mimeType ?? inline?.mime_type ?? "image/png";

    if (typeof base64 === "string" && base64.length > 0) {
      return {
        base64,
        mimeType,
      };
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is missing" }, { status: 500 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 });
    }

    const internalToken = process.env.CONVEX_INTERNAL_API_TOKEN;
    const convexClient = new ConvexHttpClient(convexUrl);
    const convexQuery = convexClient.query as unknown as (name: string, args: Record<string, unknown>) => Promise<unknown>;
    const convexAction = convexClient.action as unknown as (name: string, args: Record<string, unknown>) => Promise<unknown>;

    const currentUser = (await convexQuery("users:getByClerkIdInternal", {
      clerkId: userId,
      internalToken,
    })) as { credits?: number } | null;

    if (!currentUser) {
      return NextResponse.json({ error: "No billing profile found. Please subscribe to continue." }, { status: 403 });
    }

    const currentCredits = Number(currentUser.credits ?? 0);
    if (currentCredits <= 0) {
      return NextResponse.json({ error: "No credits left. Refill Credits to continue." }, { status: 402 });
    }

    const body = (await req.json()) as GeneratePayload;
    const planUsed: PlanUsed = body.planUsed ?? "pro";

    const prompt = (body.prompt ?? "").trim() || "Redesign this interior to look premium and photorealistic";
    const style = (body.style ?? "Modern").trim();
    const mergedPrompt = `${prompt}. Style: ${style}${planPromptSuffix(planUsed)}`;

    const parts: Array<Record<string, unknown>> = [{ text: mergedPrompt }];

    if (body.imageBase64) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: stripBase64Prefix(body.imageBase64),
        },
      });
    } else if (body.imageUrl) {
      parts.push({ text: `Use this reference image URL as input: ${body.imageUrl}` });
    } else {
      return NextResponse.json({ error: "Missing source image" }, { status: 400 });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      },
    );

    const json = await geminiResponse.json();
    if (!geminiResponse.ok) {
      return NextResponse.json(
        { error: (json as { error?: { message?: string } })?.error?.message ?? "Gemini request failed", details: json },
        { status: 500 },
      );
    }

    const generated = extractGeneratedImage(json);
    if (!generated) {
      return NextResponse.json({ error: "No generated image found in Gemini response", details: json }, { status: 500 });
    }

    const stored = (await convexAction("generations:storeGeneratedFromApi", {
      clerkId: userId,
      imageBase64: generated.base64,
      mimeType: generated.mimeType,
      prompt,
      style,
      internalToken,
    })) as { imageUrl: string; remainingCredits: number };

    return NextResponse.json({
      imageUrl: stored.imageUrl,
      remainingCredits: stored.remainingCredits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


