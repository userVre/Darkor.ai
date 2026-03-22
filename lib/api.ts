export type PlanUsed = "free" | "trial" | "basic" | "pro";

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

export async function generateImage(
  payload: GenerateRequestPayload,
  clerkToken?: string | null,
): Promise<GenerateResponse> {
  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!apiBase) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

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
