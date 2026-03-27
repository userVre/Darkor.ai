import { resolvePublicEndpoint } from "./public-endpoints";

export type PlanUsed = "free" | "trial" | "pro";

export type GenerateRequestPayload = {
  imageBase64: string;
  prompt: string;
  style: string;
  planUsed: PlanUsed;
  aspectRatio?: string;
  targetWidth?: number;
  targetHeight?: number;
};

type GenerateResponse = {
  imageUrl: string;
  remainingCredits?: number;
  generationId?: string;
  error?: string;
};

const PRODUCTION_API_BASE_URL = "https://9o39o3.vercel.app";

function resolveApiBaseUrl() {
  try {
    return resolvePublicEndpoint(process.env.EXPO_PUBLIC_API_BASE_URL, "EXPO_PUBLIC_API_BASE_URL", {
      required: true,
    });
  } catch {
    return PRODUCTION_API_BASE_URL;
  }
}

export async function generateImage(
  payload: GenerateRequestPayload,
  clerkToken?: string | null,
): Promise<GenerateResponse> {
  const apiBase = resolveApiBaseUrl();

  const response = await fetch(`${apiBase}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as GenerateResponse;
  if (!response.ok || json.error) {
    throw new Error(json.error ?? "Generation failed");
  }

  return json;
}
