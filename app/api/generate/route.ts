import { NextRequest, NextResponse } from "next/server";

type PlanUsed = "pro" | "premium" | "ultra";

type GeneratePayload = {
  imageBase64?: string;
  imageUrl?: string;
  prompt?: string;
  style?: string;
  planUsed?: PlanUsed;
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
    return ", standard quality, basic lighting";
  }
  if (plan === "premium") {
    return ", high resolution, hyper-realistic, raytracing";
  }
  return ", 8k resolution, ultra-photorealistic masterpiece, Unreal Engine 5, pristine details";
}

function planDelayMs(plan: PlanUsed) {
  if (plan === "pro") return 4000;
  if (plan === "premium") return 1500;
  return 0;
}

function extractImageData(response: any): string | null {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    const base64 = part?.inlineData?.data ?? part?.inline_data?.data;
    if (typeof base64 === "string" && base64.length > 0) {
      return `data:image/png;base64,${base64}`;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 });
    }

    const body = (await req.json()) as GeneratePayload;
    const planUsed: PlanUsed = body.planUsed ?? "pro";

    const prompt = (body.prompt ?? "").trim() || "Redesign this interior to look premium and photorealistic";
    const style = (body.style ?? "Modern").trim();
    const mergedPrompt = `${prompt}. Style: ${style}${planPromptSuffix(planUsed)}`;

    const delay = planDelayMs(planUsed);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const parts: Array<Record<string, unknown>> = [{ text: mergedPrompt }];

    if (body.imageBase64) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: stripBase64Prefix(body.imageBase64),
        },
      });
    } else if (body.imageUrl) {
      parts.push({
        text: `Use this reference image URL as input: ${body.imageUrl}`,
      });
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
        { error: json?.error?.message ?? "Gemini request failed", details: json },
        { status: 500 },
      );
    }

    const imageUrl = extractImageData(json);
    if (!imageUrl) {
      return NextResponse.json({ error: "No generated image found in Gemini response", details: json }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
