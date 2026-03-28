import { actionGeneric, internalActionGeneric, internalMutationGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const PRO_MIN_DELAY_MS = 4_000;
const AI_PROVIDER_DOWN = "AI_PROVIDER_DOWN";

type ServiceType = "paint" | "floor" | "redesign";
type SpeedTier = "standard" | "pro" | "ultra";

type GeminiInlinePart = {
  inlineData?: {
    data?: string;
    mimeType?: string;
  };
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiInlinePart[];
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
};

type DetectionPoint = {
  x: number;
  y: number;
};

type DetectionResponse = {
  confidence?: number;
  polygons?: DetectionPoint[][];
  reason?: string;
};

function trimOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeAspectRatio(aspectRatio?: string | null) {
  const trimmed = aspectRatio?.trim();
  if (!trimmed) return "1:1";
  return /^\d+:\d+$/.test(trimmed) ? trimmed : "1:1";
}

export function buildDesignPrompt(args: {
  serviceType: ServiceType;
  roomType: string;
  style: string;
  colorPalette: string;
  customPrompt?: string;
  aspectRatio?: string;
  regenerate?: boolean;
}) {
  const roomType = trimOptional(args.roomType) ?? "space";
  const style = trimOptional(args.style) ?? "luxury contemporary";
  const colorPalette = trimOptional(args.colorPalette) ?? style;
  const customPrompt = trimOptional(args.customPrompt);
  const aspectRatio = normalizeAspectRatio(args.aspectRatio);
  const variationInstruction = args.regenerate
    ? "Create a fresh alternate variation while preserving the same architectural shell, framing, and level of realism."
    : undefined;

  if (args.serviceType === "paint") {
    return [
      `You are an expert interior designer and architectural visualizer. Repaint only the masked wall area of this ${roomType.toLowerCase()} using a ${colorPalette} palette with a ${style} finish.`,
      "The second image is the edit mask. White marks the only editable wall region. Black must remain untouched.",
      "Preserve the room geometry, ceiling, trim, flooring, furniture, doors, windows, artwork, lighting, shadows, reflections, and camera framing exactly as they appear.",
      customPrompt ? `Follow these instructions exactly: ${customPrompt}.` : "Deliver a premium, believable paint transformation with refined material response and professional styling.",
      `Output a photorealistic architectural render in a ${aspectRatio} frame.`,
      variationInstruction,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (args.serviceType === "floor") {
    return [
      `You are an expert interior designer and architectural visualizer. Replace only the masked floor area in this ${roomType.toLowerCase()} with a ${style} material direction using a ${colorPalette} palette.`,
      "The second image is the edit mask. White marks the only editable floor region. Black must remain untouched.",
      "Preserve the walls, furniture, decor, trim, windows, doors, lighting, shadows, reflections, and camera framing exactly as they appear.",
      "Keep the floor perspective, material scale, joins, and grounding physically believable so the new finish looks installed in the real scene.",
      customPrompt ? `Follow these instructions exactly: ${customPrompt}.` : "Deliver a premium, photorealistic architectural material replacement with clean edge transitions.",
      `Output a photorealistic architectural render in a ${aspectRatio} frame.`,
      variationInstruction,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `You are an expert interior designer. Redesign this ${roomType} in a ${style} aesthetic.`,
    customPrompt ? `Follow these instructions: ${customPrompt}.` : "Follow these instructions: elevate the space with a refined, premium, editorial-quality composition.",
    `Use a ${colorPalette} theme.`,
    "Preserve the original floorplan, walls, doors, windows, ceiling height, and camera framing while redesigning finishes, furniture, decor, and styling.",
    "Do not warp the architecture, do not invent impossible geometry, and keep the result grounded in real-world materials and lighting.",
    `Output: 8k photorealistic architectural render in a ${aspectRatio} frame.`,
    variationInstruction,
  ]
    .filter(Boolean)
    .join(" ");
}

function decodeBase64ToBytes(base64: string) {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function parseGeminiError(response: Response) {
  const raw = await response.text();
  try {
    const json = JSON.parse(raw) as { error?: { message?: string } };
    return json.error?.message ?? raw;
  } catch {
    return raw;
  }
}

function shouldRetryGeminiStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function shouldRetryGeminiErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network error") ||
    normalized.includes("timed out")
  );
}

function normalizeGenerationError(message?: string | null) {
  const raw = trimOptional(message) ?? "Generation failed.";
  const normalized = raw.toLowerCase();

  if (raw === AI_PROVIDER_DOWN) {
    return AI_PROVIDER_DOWN;
  }

  if (normalized === "payment required") {
    return "Payment Required";
  }

  if (
    normalized.includes("missing gemini_api_key") ||
    normalized.includes("api key not valid") ||
    normalized.includes("invalid api key") ||
    normalized.includes("permission denied")
  ) {
    return "AI service configuration is unavailable right now. Please try again shortly.";
  }

  if (
    normalized.includes("quota") ||
    normalized.includes("resource exhausted") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("rate limit")
  ) {
    return "Darkor AI is temporarily at capacity. Please try again in a few minutes.";
  }

  if (normalized.includes("blocked")) {
    return "This request could not be processed safely. Try a different photo or prompt.";
  }

  return raw;
}

async function requestGeminiWithRetry(body: string, apiKey: string) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body,
      });

      if (!response.ok) {
        const errorMessage = normalizeGenerationError(await parseGeminiError(response));
        if (attempt === 0 && shouldRetryGeminiStatus(response.status)) {
          console.log("[AI] Gemini transient failure, retrying", {
            attempt: attempt + 1,
            status: response.status,
          });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        if (shouldRetryGeminiStatus(response.status)) {
          throw new ConvexError(AI_PROVIDER_DOWN);
        }
        throw new ConvexError(errorMessage || `Gemini request failed with status ${response.status}.`);
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gemini request failed.";
      lastError = error instanceof Error ? error : new Error(message);
      if (attempt === 0 && shouldRetryGeminiErrorMessage(message)) {
        console.log("[AI] Gemini network error, retrying", {
          attempt: attempt + 1,
          message,
        });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        continue;
      }
      if (shouldRetryGeminiErrorMessage(message)) {
        throw new ConvexError(AI_PROVIDER_DOWN);
      }
      throw error;
    }
  }

  throw lastError ?? new ConvexError("Gemini request failed.");
}

function extractGeneratedImage(response: GeminiResponse) {
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? [];
    for (const part of parts) {
      const data = part.inlineData?.data;
      if (data) {
        return {
          data,
          mimeType: part.inlineData?.mimeType ?? "image/png",
        };
      }
    }
  }

  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason) {
    throw new ConvexError(normalizeGenerationError(`Gemini blocked the request (${blockReason}).`));
  }

  throw new ConvexError("Gemini returned no image.");
}

function extractTextResponse(response: GeminiResponse) {
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  const textParts: string[] = [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? [];
    for (const part of parts) {
      if (typeof part.text === "string" && part.text.trim().length > 0) {
        textParts.push(part.text.trim());
      }
    }
  }

  const blockReason = response.promptFeedback?.blockReason;
  if (!textParts.length && blockReason) {
    throw new ConvexError(normalizeGenerationError(`Gemini blocked the request (${blockReason}).`));
  }

  if (!textParts.length) {
    throw new ConvexError("Gemini returned no detection result.");
  }

  return textParts.join("\n");
}

function parseJsonPayload<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const jsonText = start >= 0 && end >= start ? candidate.slice(start, end + 1) : candidate;
  return JSON.parse(jsonText) as T;
}

function clampDetectionCoordinate(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1000, Math.round(value)));
}

function sanitizeDetectionResponse(raw: DetectionResponse) {
  const confidence = Math.max(0, Math.min(100, Math.round(raw.confidence ?? 0)));
  const polygons = Array.isArray(raw.polygons)
    ? raw.polygons
        .map((polygon) =>
          Array.isArray(polygon)
            ? polygon
                .map((point) => ({
                  x: clampDetectionCoordinate(point?.x ?? 0),
                  y: clampDetectionCoordinate(point?.y ?? 0),
                }))
                .filter((point, index, points) => {
                  if (index === 0) return true;
                  const previous = points[index - 1];
                  return previous.x !== point.x || previous.y !== point.y;
                })
            : [],
        )
        .filter((polygon) => polygon.length >= 3)
    : [];

  return {
    confidence,
    polygons,
    reason: trimOptional(raw.reason) ?? null,
  };
}

function buildDetectionPrompt(target: "paint" | "floor") {
  const subject =
    target === "paint"
      ? "all visible wall surfaces that should be repaintable"
      : "all visible floor surfaces that should be restylable";
  const exclusions =
    target === "paint"
      ? "furniture, windows, doors, trim, baseboards, ceiling, art, mirrors, lamps, rugs, and flooring"
      : "walls, baseboards, rugs, mats, furniture, furniture legs, decor, stairs, and reflections";

  return [
    `Analyze this interior photo and detect ${subject}.`,
    `Exclude ${exclusions}.`,
    "Return JSON only with this exact shape:",
    '{"confidence": 0, "polygons": [[{"x": 0, "y": 0}]], "reason": ""}',
    "Use image-space coordinates from 0 to 1000 for both x and y.",
    "Each polygon should tightly trace one contiguous editable surface.",
    "Return up to 8 polygons.",
    "If confidence is below 70 or the target surface is unclear, return confidence below 70 and an empty polygons array.",
    "Do not include markdown fences or any text outside the JSON object.",
  ].join(" ");
}

function resolveImageSize(speedTier?: SpeedTier) {
  return speedTier === "ultra" ? "4K" : "2K";
}

async function waitForMinimumDuration(startedAt: number, speedTier?: SpeedTier) {
  if (speedTier !== "pro") {
    return;
  }

  const elapsed = Date.now() - startedAt;
  const remaining = PRO_MIN_DELAY_MS - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

export const saveGeneration = internalMutationGeneric({
  args: {
    generationId: v.id("generations"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new ConvexError("Generation not found.");
    }

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    await ctx.db.patch(args.generationId, {
      storageId: args.storageId,
      imageUrl: imageUrl ?? undefined,
      status: "ready",
      errorMessage: undefined,
      completedAt: Date.now(),
    });

    return {
      ok: true,
      imageUrl,
    };
  },
});

export const generateDesign: any = internalActionGeneric({
  args: {
    generationId: v.id("generations"),
    ownerId: v.string(),
    imageStorageId: v.id("_storage"),
    maskStorageId: v.optional(v.id("_storage")),
    serviceType: v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign")),
    roomType: v.string(),
    style: v.string(),
    colorPalette: v.string(),
    customPrompt: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    regenerate: v.optional(v.boolean()),
    speedTier: v.optional(v.union(v.literal("standard"), v.literal("pro"), v.literal("ultra"))),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; storageId: string; imageUrl: string | null }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const message = normalizeGenerationError("Missing GEMINI_API_KEY in Convex environment variables.");
      await ctx.runMutation((internal as any).generations.markGenerationFailed, {
        generationId: args.generationId,
        ownerId: args.ownerId,
        errorMessage: message,
      });
      throw new ConvexError(message);
    }

    const startedAt = Date.now();
    let generatedStorageId: string | null = null;

    try {
      console.log("[AI] generateDesign started", {
        generationId: args.generationId,
        serviceType: args.serviceType,
        speedTier: args.speedTier ?? "standard",
      });

      const sourceBlob = await ctx.storage.get(args.imageStorageId);
      if (!sourceBlob) {
        throw new ConvexError("The source image could not be loaded from storage.");
      }
      console.log("[AI] Source image loaded", {
        generationId: args.generationId,
        mimeType: sourceBlob.type || "image/jpeg",
        sizeBytes: sourceBlob.size,
      });

      const maskBlob = args.maskStorageId ? await ctx.storage.get(args.maskStorageId) : null;
      if (args.serviceType !== "redesign" && !maskBlob) {
        throw new ConvexError("The edit mask could not be loaded from storage.");
      }
      if (maskBlob) {
        console.log("[AI] Mask image loaded", {
          generationId: args.generationId,
          mimeType: maskBlob.type || "image/png",
          sizeBytes: maskBlob.size,
        });
      }

      const prompt = buildDesignPrompt({
        serviceType: args.serviceType,
        roomType: args.roomType,
        style: args.style,
        colorPalette: args.colorPalette,
        customPrompt: args.customPrompt,
        aspectRatio: args.aspectRatio,
        regenerate: args.regenerate,
      });

      const parts: GeminiInlinePart[] = [
        { text: prompt },
        {
          inlineData: {
            mimeType: sourceBlob.type || "image/jpeg",
            data: await blobToBase64(sourceBlob),
          },
        },
      ];

      if (maskBlob) {
        parts.push({
          text:
            args.serviceType === "paint"
              ? "Reference edit mask for wall repainting. White marks the only editable wall region."
              : "Reference edit mask for floor restyling. White marks the only editable floor region.",
        });
        parts.push({
          inlineData: {
            mimeType: maskBlob.type || "image/png",
            data: await blobToBase64(maskBlob),
          },
        });
      }

      console.log("Gemini API call started...", {
        generationId: args.generationId,
        endpoint: GEMINI_ENDPOINT,
      });
      const response = await requestGeminiWithRetry(
        JSON.stringify({
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              aspectRatio: normalizeAspectRatio(args.aspectRatio),
              imageSize: resolveImageSize(args.speedTier as SpeedTier | undefined),
            },
          },
        }),
        apiKey,
      );

      const payload = (await response.json()) as GeminiResponse;
      const generated = extractGeneratedImage(payload);
      console.log("[AI] Gemini API call completed", {
        generationId: args.generationId,
        mimeType: generated.mimeType ?? "image/png",
        base64Length: generated.data.length,
      });
      const bytes = decodeBase64ToBytes(generated.data);
      const imageBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const outputBlob = new Blob([imageBuffer], { type: generated.mimeType ?? "image/png" });

      await waitForMinimumDuration(startedAt, (args.speedTier as SpeedTier | undefined) ?? "standard");
      generatedStorageId = (await ctx.storage.store(outputBlob)) as string;
      console.log("[AI] Generated image stored", {
        generationId: args.generationId,
        storageId: generatedStorageId,
        sizeBytes: outputBlob.size,
      });

      const saveResult = (await ctx.runMutation((internal as any).ai.saveGeneration, {
        generationId: args.generationId,
        storageId: generatedStorageId,
      })) as { imageUrl?: string | null };
      console.log("[AI] Generation saved", {
        generationId: args.generationId,
        imageUrl: saveResult.imageUrl ?? null,
      });

      return {
        ok: true,
        storageId: generatedStorageId,
        imageUrl: saveResult.imageUrl ?? null,
      };
    } catch (error) {
      if (generatedStorageId) {
        await ctx.storage.delete(generatedStorageId as any);
      }

      const message = normalizeGenerationError(error instanceof Error ? error.message : "Generation failed.");
      console.log("[AI] Generation failed", {
        generationId: args.generationId,
        message,
      });
      await ctx.runMutation((internal as any).generations.markGenerationFailed, {
        generationId: args.generationId,
        ownerId: args.ownerId,
        errorMessage: message,
      });
      throw new ConvexError(message);
    }
  },
});

export const detectEditMask: any = actionGeneric({
  args: {
    imageStorageId: v.id("_storage"),
    target: v.union(v.literal("paint"), v.literal("floor")),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError(normalizeGenerationError("Missing GEMINI_API_KEY in Convex environment variables."));
    }

    const sourceBlob = await ctx.storage.get(args.imageStorageId);
    if (!sourceBlob) {
      throw new ConvexError("The source image could not be loaded from storage.");
    }

    const response = await requestGeminiWithRetry(
      JSON.stringify({
        contents: [
          {
            parts: [
              { text: buildDetectionPrompt(args.target) },
              {
                inlineData: {
                  mimeType: sourceBlob.type || "image/jpeg",
                  data: await blobToBase64(sourceBlob),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
      apiKey,
    );

    const payload = (await response.json()) as GeminiResponse;
    const rawText = extractTextResponse(payload);
    return sanitizeDetectionResponse(parseJsonPayload<DetectionResponse>(rawText));
  },
});
