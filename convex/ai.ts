import { actionGeneric, internalActionGeneric, internalMutationGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  buildStabilityNegativePrompt,
  buildStabilityPrompt,
  normalizeAspectRatio,
} from "../lib/stability-prompt-builder";

const STABILITY_API_BASE = "https://api.stability.ai";
const STABILITY_V1_IMAGE_TO_IMAGE_BASE = `${STABILITY_API_BASE}/v1/generation`;
const STABILITY_V2_INPAINT_ENDPOINT = `${STABILITY_API_BASE}/v2beta/stable-image/edit/inpaint`;
const STABILITY_OUTPUT_FORMAT = "png";
const STABILITY_REQUEST_TIMEOUT_MS = 90_000;
const GEMINI_SUGGEST_REQUEST_TIMEOUT_MS = 25_000;
const GEMINI_SUGGEST_MAX_DIMENSION = 1152;
const GEMINI_SUGGEST_MAX_INLINE_BYTES = 3 * 1024 * 1024;
const AI_PROVIDER_DOWN = "AI_PROVIDER_DOWN";
const PRO_MIN_DELAY_MS = 4_000;
const STABILITY_ALLOWED_DIMENSIONS = [
  { width: 1024, height: 1024 },
  { width: 1152, height: 896 },
  { width: 1216, height: 832 },
  { width: 1344, height: 768 },
  { width: 1536, height: 640 },
  { width: 640, height: 1536 },
  { width: 768, height: 1344 },
  { width: 832, height: 1216 },
  { width: 896, height: 1152 },
];

const FREE_ENGINE = "stable-diffusion-xl-1024-v1-0";
const PRO_ENGINE = "stable-diffusion-xl-1024-v1-0";

type ServiceType = "paint" | "floor" | "redesign";
type SpeedTier = "standard" | "pro" | "ultra";

type DetectionPoint = {
  x: number;
  y: number;
};

type DetectionResponse = {
  confidence: number;
  polygons: DetectionPoint[][];
  reason?: string | null;
};

type StabilityArtifact = {
  base64?: string;
  finishReason?: string;
  seed?: number;
};

type StabilityV1Response = {
  artifacts?: StabilityArtifact[];
  message?: string;
  name?: string;
  errors?: string[];
};

type StabilityErrorPayload = {
  errors?: string[];
  message?: string;
  name?: string;
  id?: string;
};

function trimOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
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

async function prepareSuggestionImage(blob: Blob) {
  const originalBytes = new Uint8Array(await blob.arrayBuffer());
  if (originalBytes.byteLength <= GEMINI_SUGGEST_MAX_INLINE_BYTES) {
    return {
      base64: await blobToBase64(blob),
      mimeType: blob.type || "image/jpeg",
    };
  }

  const jimpModule = (await import("jimp-compact")) as any;
  const Jimp = jimpModule.default ?? jimpModule;
  const image = await Jimp.read(originalBytes);
  image.scaleToFit(GEMINI_SUGGEST_MAX_DIMENSION, GEMINI_SUGGEST_MAX_DIMENSION);
  image.quality(76);
  const optimizedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
  const optimizedBlob = new Blob([optimizedBuffer], { type: "image/jpeg" });

  return {
    base64: await blobToBase64(optimizedBlob),
    mimeType: "image/jpeg",
  };
}

function normalizeGenerationError(message?: string | null) {
  const raw = trimOptional(message) ?? "Generation failed.";
  const normalized = raw.toLowerCase();

  if (raw === AI_PROVIDER_DOWN) {
    return AI_PROVIDER_DOWN;
  }

  if (
    normalized.includes("missing stability_api_key") ||
    normalized.includes("api key missing") ||
    normalized.includes("api key invalid") ||
    normalized.includes("unauthorized") ||
    normalized.includes("permission denied")
  ) {
    return "AI service configuration is unavailable right now. Please try again shortly.";
  }

  if (
    normalized.includes("content filtered") ||
    normalized.includes("content_filter") ||
    normalized.includes("safety") ||
    normalized.includes("moderation")
  ) {
    return "This request could not be processed safely. Try a different photo or prompt.";
  }

  if (
    normalized.includes("credit") ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("resource exhausted") ||
    normalized.includes("temporarily unavailable")
  ) {
    return "HomeDecor AI is temporarily at capacity. Please try again in a few minutes.";
  }

  if (
    normalized.includes("invalid image") ||
    normalized.includes("unsupported image") ||
    normalized.includes("unable to decode") ||
    normalized.includes("invalid_file_size") ||
    normalized.includes("invalid_mime_type")
  ) {
    return "The selected image could not be processed. Please try a different photo.";
  }

  if (normalized.includes("timed out")) {
    return "AI is busy, please try again in a moment.";
  }

  return raw;
}

async function parseStabilityError(response: Response) {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw) as StabilityErrorPayload;
    const combined = [
      ...(Array.isArray(parsed.errors) ? parsed.errors : []),
      parsed.message,
      parsed.name,
      parsed.id,
    ]
      .filter(Boolean)
      .join(" | ");
    return combined || raw;
  } catch {
    return raw;
  }
}

function shouldRetryStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function shouldRetryMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network error") ||
    normalized.includes("timed out")
  );
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The AI request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestStabilityWithRetry(args: {
  apiKey: string;
  body: BodyInit;
  endpoint: string;
  providerLabel: string;
}) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        args.endpoint,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${args.apiKey}`,
            accept: "application/json",
          },
          body: args.body,
        },
        STABILITY_REQUEST_TIMEOUT_MS,
      );

      if (!response.ok) {
        const errorMessage = normalizeGenerationError(await parseStabilityError(response));
        if (attempt === 0 && shouldRetryStatus(response.status)) {
          await new Promise((resolve) => setTimeout(resolve, 1_500));
          continue;
        }
        if (shouldRetryStatus(response.status)) {
          throw new ConvexError(AI_PROVIDER_DOWN);
        }
        throw new ConvexError(errorMessage || `${args.providerLabel} request failed with status ${response.status}.`);
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : `${args.providerLabel} request failed.`;
      lastError = error instanceof Error ? error : new Error(message);
      if (attempt === 0 && shouldRetryMessage(message)) {
        await new Promise((resolve) => setTimeout(resolve, 1_500));
        continue;
      }
      if (shouldRetryMessage(message)) {
        throw new ConvexError(AI_PROVIDER_DOWN);
      }
      throw error;
    }
  }

  throw lastError ?? new ConvexError(`${args.providerLabel} request failed.`);
}

function resolveRenderProfile(args: { planUsed?: string; speedTier?: SpeedTier; serviceType: ServiceType }) {
  const isProPlan = args.planUsed === "pro";
  const isPaidTier = isProPlan || args.speedTier === "pro" || args.speedTier === "ultra";

  if (args.serviceType === "redesign") {
    return {
      engine: isPaidTier ? PRO_ENGINE : FREE_ENGINE,
      cfgScale: isPaidTier ? 11 : 7,
      steps: isPaidTier ? 50 : 28,
      imageStrength: isPaidTier ? 0.42 : 0.36,
      providerLabel: "Stability image-to-image generator",
      width: 1024,
      height: 1024,
      watermarkRequired: !isProPlan,
    };
  }

  return {
    engine: isPaidTier ? PRO_ENGINE : FREE_ENGINE,
    cfgScale: isPaidTier ? 10 : 7,
    steps: isPaidTier ? 45 : 28,
    imageStrength: undefined,
    providerLabel: "Stability inpainting generator",
    width: 1024,
    height: 1024,
    watermarkRequired: !isProPlan,
  };
}

function extractGeneratedImage(response: StabilityV1Response) {
  const artifacts = Array.isArray(response.artifacts) ? response.artifacts : [];
  const successful = artifacts.find((artifact) => artifact.finishReason !== "CONTENT_FILTERED" && artifact.base64);
  if (successful?.base64) {
    return successful.base64;
  }

  if (artifacts.some((artifact) => artifact.finishReason === "CONTENT_FILTERED")) {
    throw new ConvexError("CONTENT_FILTERED");
  }

  const errors = Array.isArray(response.errors) ? response.errors.join(" | ") : "";
  throw new ConvexError(errors || response.message || "Stability returned no image.");
}

function buildPrompt(args: {
  serviceType: ServiceType;
  roomType: string;
  style: string;
  styleSelections?: string[];
  colorPalette: string;
  customPrompt?: string;
  targetColor?: string;
  targetSurface?: string;
  aspectRatio?: string;
  regenerate?: boolean;
  smartSuggest?: boolean;
}) {
  return buildStabilityPrompt({
    serviceType: args.serviceType,
    roomType: args.roomType,
    style: args.style,
    styleSelections: args.styleSelections,
    colorPalette: args.colorPalette,
    customPrompt: args.customPrompt,
    targetColor: args.targetColor,
    targetSurface: args.targetSurface,
    aspectRatio: args.aspectRatio,
    regenerate: args.regenerate,
    smartSuggest: args.smartSuggest,
  });
}

function appendPromptFields(formData: FormData, args: {
  prompt: string;
  negativePrompt: string;
  cfgScale: number;
  steps: number;
  width?: number;
  height?: number;
  imageStrength?: number;
}) {
  formData.append("text_prompts[0][text]", args.prompt);
  formData.append("text_prompts[0][weight]", "1");
  formData.append("text_prompts[1][text]", args.negativePrompt);
  formData.append("text_prompts[1][weight]", "-1");
  formData.append("cfg_scale", String(args.cfgScale));
  formData.append("steps", String(args.steps));
  formData.append("samples", "1");
  if (typeof args.width === "number") {
    formData.append("width", String(args.width));
  }
  if (typeof args.height === "number") {
    formData.append("height", String(args.height));
  }
  if (typeof args.imageStrength === "number") {
    formData.append("init_image_mode", "IMAGE_STRENGTH");
    formData.append("image_strength", String(args.imageStrength));
  }
}

async function runRedesignGeneration(args: {
  apiKey: string;
  prompt: string;
  negativePrompt: string;
  sourceBlob: Blob;
  renderProfile: ReturnType<typeof resolveRenderProfile>;
}) {
  const formData = new FormData();
  formData.append("init_image", args.sourceBlob, "source.png");
  appendPromptFields(formData, {
    prompt: args.prompt,
    negativePrompt: args.negativePrompt,
    cfgScale: args.renderProfile.cfgScale,
    steps: args.renderProfile.steps,
    imageStrength: args.renderProfile.imageStrength,
  });

  const response = await requestStabilityWithRetry({
    apiKey: args.apiKey,
    body: formData,
    endpoint: `${STABILITY_V1_IMAGE_TO_IMAGE_BASE}/${args.renderProfile.engine}/image-to-image`,
    providerLabel: args.renderProfile.providerLabel,
  });

  const payload = (await response.json()) as StabilityV1Response;
  return extractGeneratedImage(payload);
}

async function runMaskedGeneration(args: {
  apiKey: string;
  prompt: string;
  negativePrompt: string;
  sourceBlob: Blob;
  maskBlob: Blob;
  renderProfile: ReturnType<typeof resolveRenderProfile>;
}) {
  const formData = new FormData();
  formData.append("image", args.sourceBlob, "source.png");
  formData.append("mask", args.maskBlob, "mask.png");
  formData.append("prompt", args.prompt);
  formData.append("negative_prompt", args.negativePrompt);
  formData.append("output_format", STABILITY_OUTPUT_FORMAT);
  formData.append("strength", String(args.renderProfile.imageStrength ?? 0.35));

  const response = await requestStabilityWithRetry({
    apiKey: args.apiKey,
    body: formData,
    endpoint: STABILITY_V2_INPAINT_ENDPOINT,
    providerLabel: args.renderProfile.providerLabel,
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as StabilityV1Response & { image?: string };
    const encoded = payload.image ?? extractGeneratedImage(payload);
    return encoded;
  }

  const generatedBlob = await response.blob();
  return blobToBase64(generatedBlob);
}

async function applyHomeDecorWatermark(blob: Blob) {
  const jimpModule = (await import("jimp-compact")) as any;
  const Jimp = jimpModule.default ?? jimpModule;
  const image = await Jimp.read(new Uint8Array(await blob.arrayBuffer()));
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const margin = Math.max(24, Math.round(Math.min(width, height) * 0.035));
  const boxHeight = Math.max(52, Math.round(height * 0.075));
  const overlayTop = height - boxHeight - margin;

  image.scan(0, overlayTop, width, boxHeight + margin, (x: number, y: number, index: number) => {
    if (y < overlayTop) return;
    image.bitmap.data[index + 0] = Math.round(image.bitmap.data[index + 0] * 0.78);
    image.bitmap.data[index + 1] = Math.round(image.bitmap.data[index + 1] * 0.78);
    image.bitmap.data[index + 2] = Math.round(image.bitmap.data[index + 2] * 0.78);
  });

  image.print(
    font,
    margin,
    overlayTop + Math.max(10, Math.round(boxHeight * 0.2)),
    {
      text: "HomeDecor.ai",
      alignmentX: Jimp.HORIZONTAL_ALIGN_RIGHT,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    },
    width - margin * 2,
    boxHeight,
  );

  const watermarked = await image.getBufferAsync(Jimp.MIME_PNG);
  return new Blob([watermarked], { type: "image/png" });
}

function chooseClosestDimension(width: number, height: number, preferLarger: boolean) {
  const aspectRatio = width / Math.max(height, 1);
  const sourceArea = width * height;

  return STABILITY_ALLOWED_DIMENSIONS.slice().sort((left, right) => {
    const leftAspectPenalty = Math.abs(left.width / left.height - aspectRatio);
    const rightAspectPenalty = Math.abs(right.width / right.height - aspectRatio);
    if (leftAspectPenalty !== rightAspectPenalty) {
      return leftAspectPenalty - rightAspectPenalty;
    }

    const leftAreaPenalty = Math.abs(left.width * left.height - sourceArea);
    const rightAreaPenalty = Math.abs(right.width * right.height - sourceArea);
    if (leftAreaPenalty !== rightAreaPenalty) {
      return leftAreaPenalty - rightAreaPenalty;
    }

    return preferLarger
      ? right.width * right.height - left.width * left.height
      : left.width * left.height - right.width * right.height;
  })[0]!;
}

async function normalizeImagesForStability(args: {
  sourceBlob: Blob;
  maskBlob?: Blob | null;
  preferLarger: boolean;
}) {
  const jimpModule = (await import("jimp-compact")) as any;
  const Jimp = jimpModule.default ?? jimpModule;
  const source = await Jimp.read(new Uint8Array(await args.sourceBlob.arrayBuffer()));
  const dimension = chooseClosestDimension(source.bitmap.width, source.bitmap.height, args.preferLarger);

  source.cover(dimension.width, dimension.height);
  const sourceBuffer = await source.getBufferAsync(Jimp.MIME_PNG);

  let normalizedMaskBlob: Blob | null = null;
  if (args.maskBlob) {
    const mask = await Jimp.read(new Uint8Array(await args.maskBlob.arrayBuffer()));
    mask.cover(dimension.width, dimension.height, Jimp.RESIZE_NEAREST_NEIGHBOR);
    mask.greyscale();
    mask.threshold({ max: 120 });
    const maskBuffer = await mask.getBufferAsync(Jimp.MIME_PNG);
    normalizedMaskBlob = new Blob([maskBuffer], { type: "image/png" });
  }

  return {
    sourceBlob: new Blob([sourceBuffer], { type: "image/png" }),
    maskBlob: normalizedMaskBlob,
    dimension,
  };
}

function clampDetectionCoordinate(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1000, Math.round(value)));
}

function heuristicDetection(target: "paint" | "floor"): DetectionResponse {
  if (target === "floor") {
    return {
      confidence: 42,
      polygons: [[
        { x: 80, y: 620 },
        { x: 920, y: 620 },
        { x: 980, y: 980 },
        { x: 20, y: 980 },
      ]],
      reason: "Automatic detection is temporarily conservative during the Stability migration.",
    };
  }

  return {
    confidence: 38,
    polygons: [
      [
        { x: 20, y: 40 },
        { x: 470, y: 40 },
        { x: 470, y: 760 },
        { x: 20, y: 760 },
      ],
      [
        { x: 530, y: 40 },
        { x: 980, y: 40 },
        { x: 980, y: 760 },
        { x: 530, y: 760 },
      ],
    ],
    reason: "Automatic detection is temporarily conservative during the Stability migration.",
  };
}

async function waitForMinimumDuration(startedAt: number, speedTier?: SpeedTier) {
  if (speedTier !== "pro" && speedTier !== "ultra") {
    return;
  }

  const elapsed = Date.now() - startedAt;
  const remaining = PRO_MIN_DELAY_MS - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

function extractJsonBlock(value: string) {
  const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i) ?? value.match(/```([\s\S]*?)```/i);
  return (fencedMatch?.[1] ?? value).trim();
}

function normalizeSuggestionChoice(value: string | undefined, options: string[], fallback: string) {
  const normalizedValue = trimOptional(value)?.toLowerCase();
  if (!normalizedValue) {
    return fallback;
  }

  const directMatch = options.find((option) => option.toLowerCase() === normalizedValue);
  if (directMatch) {
    return directMatch;
  }

  const partialMatch = options.find((option) => normalizedValue.includes(option.toLowerCase()) || option.toLowerCase().includes(normalizedValue));
  return partialMatch ?? fallback;
}

function buildFallbackSuggestion(args: {
  roomType: string;
  availableStyles: string[];
  availablePalettes: string[];
}) {
  const room = args.roomType.toLowerCase();
  const styleFallback =
    args.availableStyles.find((style) => room.includes("bath") && style.toLowerCase().includes("minimal")) ??
    args.availableStyles.find((style) => room.includes("bed") && style.toLowerCase().includes("japandi")) ??
    args.availableStyles.find((style) => room.includes("living") && style.toLowerCase().includes("modern")) ??
    args.availableStyles[0] ??
    "Modern";
  const paletteFallback =
    args.availablePalettes.find((palette) => room.includes("bath") && palette.toLowerCase().includes("gray")) ??
    args.availablePalettes.find((palette) => room.includes("bed") && palette.toLowerCase().includes("surprise")) ??
    args.availablePalettes.find((palette) => room.includes("living") && palette.toLowerCase().includes("terracotta")) ??
    args.availablePalettes[0] ??
    "surprise";

  return {
    style: styleFallback,
    paletteId: paletteFallback,
    reason: `Fallback recommendation tuned to the detected ${args.roomType} context.`,
    source: "fallback" as const,
  };
}

function parseSuggestionResponse(payload: any) {
  const directText = trimOptional(payload?.text);
  if (directText) {
    return directText;
  }

  const candidateText = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part?.text ?? "")
    .join("")
    .trim();

  return trimOptional(candidateText);
}

export const suggestDesignOptions: any = actionGeneric({
  args: {
    imageStorageId: v.id("_storage"),
    serviceType: v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign")),
    roomType: v.string(),
    availableStyles: v.array(v.string()),
    availablePalettes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const fallback = buildFallbackSuggestion(args);
    const apiKey = trimOptional(process.env.GEMINI_API_KEY);
    const model = trimOptional(process.env.GEMINI_TEXT_MODEL) ?? "gemini-3.1-pro-preview";

    if (!apiKey) {
      return fallback;
    }

    const sourceBlob = await ctx.storage.get(args.imageStorageId);
    if (!sourceBlob) {
      return fallback;
    }

    try {
      const { base64, mimeType } = await prepareSuggestionImage(sourceBlob);
      const prompt = [
        "You are an architectural interior and exterior design selector.",
        `Service type: ${args.serviceType}.`,
        `Room type: ${args.roomType}.`,
        `Available styles: ${args.availableStyles.join(", ")}.`,
        `Available palettes: ${args.availablePalettes.join(", ")}.`,
        "Analyze the room architecture and automatically pick the most suitable design style.",
        "Then choose the best matching palette.",
        'Return strict JSON like {"style":"Modern","paletteId":"terracotta","reason":"..."} with no extra text.',
      ].join(" ");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GEMINI_SUGGEST_REQUEST_TIMEOUT_MS);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
          },
        }),
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        console.error("suggestDesignOptions: Gemini request failed", response.status, await response.text().catch(() => ""));
        return fallback;
      }

      const payload = await response.json();
      const text = parseSuggestionResponse(payload);
      if (!text) {
        console.error("suggestDesignOptions: Gemini returned no text payload");
        return fallback;
      }

      const parsed = JSON.parse(extractJsonBlock(text)) as {
        style?: string;
        paletteId?: string;
        reason?: string;
      };

      return {
        style: normalizeSuggestionChoice(parsed.style, args.availableStyles, fallback.style),
        paletteId: normalizeSuggestionChoice(parsed.paletteId, args.availablePalettes, fallback.paletteId),
        reason: trimOptional(parsed.reason) ?? fallback.reason,
        source: "gemini" as const,
      };
    } catch (error) {
      console.error("suggestDesignOptions: falling back after error", error);
      return fallback;
    }
  },
});

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

export const saveOptimizedPrompt = internalMutationGeneric({
  args: {
    generationId: v.id("generations"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new ConvexError("Generation not found.");
    }

    await ctx.db.patch(args.generationId, {
      prompt: args.prompt,
    });

    return { ok: true };
  },
});

export const generateDesign: any = internalActionGeneric({
  args: {
    generationId: v.id("generations"),
    ownerId: v.string(),
    imageStorageId: v.id("_storage"),
    referenceImageStorageIds: v.optional(v.array(v.id("_storage"))),
    maskStorageId: v.optional(v.id("_storage")),
    serviceType: v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign")),
    roomType: v.string(),
    style: v.string(),
    styleSelections: v.optional(v.array(v.string())),
    colorPalette: v.string(),
    customPrompt: v.optional(v.string()),
    targetColor: v.optional(v.string()),
    targetColorHex: v.optional(v.string()),
    targetColorCategory: v.optional(v.string()),
    targetSurface: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    regenerate: v.optional(v.boolean()),
    smartSuggest: v.optional(v.boolean()),
    speedTier: v.optional(v.union(v.literal("standard"), v.literal("pro"), v.literal("ultra"))),
    planUsed: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; storageId: string; imageUrl: string | null }> => {
    const apiKey = trimOptional(process.env.STABILITY_API_KEY);
    if (!apiKey) {
      const message = normalizeGenerationError("Missing STABILITY_API_KEY in Convex environment variables.");
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
      const sourceBlob = await ctx.storage.get(args.imageStorageId);
      if (!sourceBlob) {
        throw new ConvexError("The source image could not be loaded from storage.");
      }

      const maskBlob = args.maskStorageId ? await ctx.storage.get(args.maskStorageId) : null;
      if (args.serviceType !== "redesign" && !maskBlob) {
        throw new ConvexError("The edit mask could not be loaded from storage.");
      }

      const normalizedAssets = await normalizeImagesForStability({
        sourceBlob,
        maskBlob,
        preferLarger: args.planUsed === "pro" || args.speedTier === "pro" || args.speedTier === "ultra",
      });

      const renderProfile = resolveRenderProfile({
        planUsed: trimOptional(args.planUsed),
        speedTier: (args.speedTier as SpeedTier | undefined) ?? "standard",
        serviceType: args.serviceType,
      });

      const optimizedPrompt = buildPrompt({
        serviceType: args.serviceType,
        roomType: args.roomType,
        style: args.style,
        styleSelections: args.styleSelections,
        colorPalette: args.colorPalette,
        customPrompt: args.customPrompt,
        targetColor: args.targetColor,
        targetSurface: args.targetSurface,
        aspectRatio: args.aspectRatio,
        regenerate: args.regenerate,
        smartSuggest: args.smartSuggest,
      });
      const negativePrompt = buildStabilityNegativePrompt({
        serviceType: args.serviceType,
      });

      await ctx.runMutation((internal as any).ai.saveOptimizedPrompt, {
        generationId: args.generationId,
        prompt: optimizedPrompt,
      });

      const generatedBase64 =
        args.serviceType === "redesign"
          ? await runRedesignGeneration({
              apiKey,
              prompt: optimizedPrompt,
              negativePrompt,
              sourceBlob: normalizedAssets.sourceBlob,
              renderProfile,
            })
          : await runMaskedGeneration({
              apiKey,
              prompt: optimizedPrompt,
              negativePrompt,
              sourceBlob: normalizedAssets.sourceBlob,
              maskBlob: normalizedAssets.maskBlob!,
              renderProfile,
            });

      const bytes = decodeBase64ToBytes(generatedBase64);
      const imageBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      let outputBlob = new Blob([imageBuffer], { type: "image/png" });

      if (renderProfile.watermarkRequired) {
        outputBlob = await applyHomeDecorWatermark(outputBlob);
      }

      await waitForMinimumDuration(startedAt, (args.speedTier as SpeedTier | undefined) ?? "standard");
      generatedStorageId = (await ctx.storage.store(outputBlob)) as string;

      const saveResult = (await ctx.runMutation((internal as any).ai.saveGeneration, {
        generationId: args.generationId,
        storageId: generatedStorageId,
      })) as { imageUrl?: string | null };

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
  handler: async (_ctx, args) => {
    const fallback = heuristicDetection(args.target);
    return {
      confidence: clampDetectionCoordinate(fallback.confidence),
      polygons: fallback.polygons.map((polygon) =>
        polygon.map((point) => ({
          x: clampDetectionCoordinate(point.x),
          y: clampDetectionCoordinate(point.y),
        })),
      ),
      reason: trimOptional(fallback.reason) ?? null,
    };
  },
});
