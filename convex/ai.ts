import { actionGeneric, internalActionGeneric, internalMutationGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  buildStabilityNegativePrompt,
  buildStabilityPrompt,
  normalizeAspectRatio,
} from "../lib/stability-prompt-builder";

const GEMINI_SUGGEST_REQUEST_TIMEOUT_MS = 25_000;
const GEMINI_SUGGEST_MAX_DIMENSION = 1152;
const GEMINI_SUGGEST_MAX_INLINE_BYTES = 3 * 1024 * 1024;
const AI_PROVIDER_DOWN = "AI_PROVIDER_DOWN";
const AZURE_IMAGE_API_VERSION = "2024-02-01";
const AZURE_IMAGE_REQUEST_TIMEOUT_MS = 90_000;
const AZURE_OUTPUT_SIZE = 1024;
const AZURE_OUTPUT_FORMAT = "png";
const FREE_MAX_DIMENSION = 1080;
const AZURE_QUALITY_FREE = "medium";
const AZURE_QUALITY_PRO = "high";

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

type AzureGenerationResponse = {
  created?: number;
  data?: Array<{
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    code?: string;
    message?: string;
    inner_error?: {
      code?: string;
      content_filter_result?: unknown;
    };
  };
  message?: string;
};

type AzureErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    inner_error?: {
      code?: string;
      content_filter_result?: unknown;
    };
  };
  message?: string;
  details?: Array<{ code?: string; message?: string }>;
};

type DesignOrchestrationResult = {
  style: string;
  styles?: string[];
  paletteId?: string;
  wallColor?: string;
  floorMaterial?: string;
  customPrompt?: string;
  fusionPrompt?: string;
  reason?: string;
  source: "gemini" | "fallback";
};

type AzureRenderProfile = {
  editEndpoint: string;
  generationEndpoint: string;
  deploymentName: string;
  quality: string;
  size: "1024x1024";
  watermarkRequired: boolean;
};

function redactSecret(value?: string | null) {
  const normalized = trimOptional(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length <= 8) {
    return "***";
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

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
    normalized.includes("missing azure_openai_api_key") ||
    normalized.includes("missing azure_openai_endpoint") ||
    normalized.includes("missing azure_openai_deployment_name") ||
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
    normalized.includes("content policy") ||
    normalized.includes("responsible ai policy") ||
    normalized.includes("image was filtered") ||
    normalized.includes("safety") ||
    normalized.includes("moderation")
  ) {
    return "This image request was refused for safety reasons. Try a different photo or prompt.";
  }

  if (
    normalized.includes("credit") ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("resource exhausted") ||
    normalized.includes("insufficient_quota") ||
    normalized.includes("billing") ||
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

function joinNaturalLanguage(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function dedupeSuggestions(values: Array<string | undefined>, fallback?: string) {
  const unique: string[] = [];

  for (const value of values) {
    const trimmed = trimOptional(value);
    if (!trimmed) continue;
    if (unique.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) continue;
    unique.push(trimmed);
  }

  if (unique.length === 0 && fallback) {
    unique.push(fallback);
  }

  return unique;
}

function buildStyleDirection(style: string, styleSelections?: string[]) {
  const normalizedStyle = trimOptional(style) ?? "Modern";
  const normalizedSelections =
    (styleSelections ?? [])
      .map((value) => trimOptional(value))
      .filter((value): value is string => Boolean(value && value.toLowerCase() !== normalizedStyle.toLowerCase()));

  if (normalizedSelections.length === 0) {
    return normalizedStyle;
  }

  return `A fusion of ${joinNaturalLanguage([normalizedStyle, ...normalizedSelections])} styles`;
}

function hasMultipleDistinctStyles(style: string, styleSelections?: string[]) {
  const normalized = dedupeSuggestions([style, ...(styleSelections ?? [])], style);
  return normalized.length > 1;
}

function compactPromptSegments(parts: Array<string | undefined>) {
  return parts
    .map((part) => trimOptional(part))
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

async function parseAzureError(response: Response) {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw) as AzureErrorPayload;
    const combined = [
      parsed.error?.code,
      parsed.error?.inner_error?.code,
      parsed.error?.message,
      parsed.message,
      ...(Array.isArray(parsed.details) ? parsed.details.flatMap((detail) => [detail.code, detail.message]) : []),
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

function normalizeAzureEndpoint(endpoint: string) {
  return endpoint.replace(/\/+$/, "");
}

function buildAzureImageEndpoint(endpoint: string, deploymentName: string, operation: "edits" | "generations") {
  return `${normalizeAzureEndpoint(endpoint)}/openai/deployments/${deploymentName}/images/${operation}?api-version=${AZURE_IMAGE_API_VERSION}`;
}

function resolveAzureRenderProfile(args: { endpoint: string; deploymentName: string; planUsed?: string; speedTier?: SpeedTier }) {
  const isProPlan = args.planUsed === "pro";
  const isPaidTier = isProPlan || args.speedTier === "pro" || args.speedTier === "ultra";

  return {
    editEndpoint: buildAzureImageEndpoint(args.endpoint, args.deploymentName, "edits"),
    generationEndpoint: buildAzureImageEndpoint(args.endpoint, args.deploymentName, "generations"),
    deploymentName: args.deploymentName,
    quality: isPaidTier ? AZURE_QUALITY_PRO : AZURE_QUALITY_FREE,
    size: "1024x1024" as const,
    watermarkRequired: !isProPlan,
  } satisfies AzureRenderProfile;
}

async function requestAzureImageWithRetry(args: {
  apiKey: string;
  body: BodyInit;
  endpoint: string;
  contentType?: string;
}) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      console.log("requestAzureImageWithRetry: sending request", {
        attempt: attempt + 1,
        endpoint: args.endpoint,
        contentType: args.contentType ?? "multipart/form-data",
      });
      const response = await fetchWithTimeout(
        args.endpoint,
        {
          method: "POST",
          headers: {
            "api-key": args.apiKey,
            ...(args.contentType ? { "Content-Type": args.contentType } : {}),
          },
          body: args.body,
        },
        AZURE_IMAGE_REQUEST_TIMEOUT_MS,
      );

      if (!response.ok) {
        const parsedError = await parseAzureError(response);
        console.error("requestAzureImageWithRetry: Azure request failed", {
          attempt: attempt + 1,
          endpoint: args.endpoint,
          error: parsedError,
          status: response.status,
        });
        if (attempt === 0 && shouldRetryStatus(response.status)) {
          await new Promise((resolve) => setTimeout(resolve, 1_500));
          continue;
        }
        if (shouldRetryStatus(response.status)) {
          throw new ConvexError(AI_PROVIDER_DOWN);
        }
        throw new ConvexError(parsedError || `Azure OpenAI image generation failed with status ${response.status}.`);
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Azure OpenAI image generation failed.";
      console.error("requestAzureImageWithRetry: request threw", {
        attempt: attempt + 1,
        endpoint: args.endpoint,
        message,
      });
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

  throw lastError ?? new ConvexError("Azure OpenAI image generation failed.");
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

function buildAzurePrompt(prompt: string, negativePrompt: string) {
  return `${prompt}\n\nAvoid: ${negativePrompt}`;
}

function extractAzureGeneratedImage(response: AzureGenerationResponse) {
  const imageBase64 = response.data?.find((item) => trimOptional(item?.b64_json))?.b64_json;
  if (imageBase64) {
    return imageBase64;
  }

  const message =
    response.error?.message ??
    response.error?.inner_error?.code ??
    response.message ??
    "Azure OpenAI returned no image.";
  throw new ConvexError(message);
}

async function runAzureImageGeneration(args: {
  apiKey: string;
  prompt: string;
  negativePrompt: string;
  sourceBlob: Blob;
  maskBlob?: Blob | null;
  renderProfile: AzureRenderProfile;
}) {
  const formData = new FormData();
  formData.append("model", args.renderProfile.deploymentName);
  formData.append("prompt", buildAzurePrompt(args.prompt, args.negativePrompt));
  formData.append("n", "1");
  formData.append("size", args.renderProfile.size);
  formData.append("quality", args.renderProfile.quality);
  formData.append("output_format", AZURE_OUTPUT_FORMAT);
  formData.append("image", args.sourceBlob, "source.png");

  if (args.maskBlob) {
    formData.append("mask", args.maskBlob, "mask.png");
  }

  console.log("runAzureImageGeneration: prepared Azure edit request", {
    endpoint: args.renderProfile.editEndpoint,
    hasMask: Boolean(args.maskBlob),
    quality: args.renderProfile.quality,
    size: args.renderProfile.size,
  });

  const response = await requestAzureImageWithRetry({
    apiKey: args.apiKey,
    body: formData,
    endpoint: args.renderProfile.editEndpoint,
  });

  const body = (await response.json()) as AzureGenerationResponse;
  return extractAzureGeneratedImage(body);
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

async function normalizeImagesForAzure(args: {
  sourceBlob: Blob;
  maskBlob?: Blob | null;
}) {
  const jimpModule = (await import("jimp-compact")) as any;
  const Jimp = jimpModule.default ?? jimpModule;
  const source = await Jimp.read(new Uint8Array(await args.sourceBlob.arrayBuffer()));
  source.cover(AZURE_OUTPUT_SIZE, AZURE_OUTPUT_SIZE);
  const sourceBuffer = await source.getBufferAsync(Jimp.MIME_PNG);

  let normalizedMaskBlob: Blob | null = null;
  if (args.maskBlob) {
    const mask = await Jimp.read(new Uint8Array(await args.maskBlob.arrayBuffer()));
    mask.cover(AZURE_OUTPUT_SIZE, AZURE_OUTPUT_SIZE, Jimp.RESIZE_NEAREST_NEIGHBOR);
    mask.greyscale();
    mask.threshold({ max: 120 });
    const maskBuffer = await mask.getBufferAsync(Jimp.MIME_PNG);
    normalizedMaskBlob = new Blob([maskBuffer], { type: "image/png" });
  }

  return {
    sourceBlob: new Blob([sourceBuffer], { type: "image/png" }),
    maskBlob: normalizedMaskBlob,
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
      reason: "Automatic detection is temporarily conservative during the Azure image migration.",
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
    reason: "Automatic detection is temporarily conservative during the Azure image migration.",
  };
}

async function limitFreeImageResolution(blob: Blob) {
  const jimpModule = (await import("jimp-compact")) as any;
  const Jimp = jimpModule.default ?? jimpModule;
  const image = await Jimp.read(new Uint8Array(await blob.arrayBuffer()));
  image.scaleToFit(FREE_MAX_DIMENSION, FREE_MAX_DIMENSION);
  const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
  return new Blob([buffer], { type: "image/png" });
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
  const companionStyles = args.availableStyles.filter((style) => style.toLowerCase() !== styleFallback.toLowerCase()).slice(0, 2);

  return {
    style: styleFallback,
    styles: dedupeSuggestions([styleFallback, ...companionStyles], styleFallback).slice(0, 3),
    paletteId: paletteFallback,
    reason: `Fallback recommendation tuned to the detected ${args.roomType} context.`,
    source: "fallback" as const,
  };
}

function buildFallbackOrchestration(args: {
  serviceType: ServiceType;
  roomType: string;
  style: string;
  styleSelections?: string[];
  colorPalette?: string;
}) {
  const normalizedRoom = args.roomType.toLowerCase();
  const styleDirection = buildStyleDirection(args.style, args.styleSelections);
  const balancedWallColor =
    normalizedRoom.includes("bath") ? "soft warm white" :
    normalizedRoom.includes("bed") ? "muted greige" :
    normalizedRoom.includes("living") ? "refined mushroom beige" :
    "balanced warm white";
  const balancedFloorMaterial =
    normalizedRoom.includes("bath") ? "honed light travertine" :
    normalizedRoom.includes("bed") ? "natural matte oak planks" :
    normalizedRoom.includes("living") ? "wide-plank European oak" :
    "matte natural oak flooring";

  if (args.serviceType === "paint") {
    return {
      style: styleDirection,
      wallColor: balancedWallColor,
      customPrompt: `Use ${balancedWallColor} as the professionally balanced wall color choice after analyzing the room's current furniture, lighting, and materials.`,
      reason: "Fallback balanced wall color selected for a high-end result.",
      source: "fallback" as const,
    };
  }

  if (args.serviceType === "floor") {
    return {
      style: styleDirection,
      floorMaterial: balancedFloorMaterial,
      customPrompt: `Use ${balancedFloorMaterial} as the professionally balanced flooring material after analyzing the room's furniture, lighting, and overall design language.`,
      reason: "Fallback balanced floor material selected for a high-end result.",
      source: "fallback" as const,
    };
  }

  return {
    style: styleDirection,
    styles: dedupeSuggestions([args.style, ...(args.styleSelections ?? [])], args.style),
    paletteId: trimOptional(args.colorPalette) ?? "surprise",
    customPrompt: `Resolve the room using a refined ${styleDirection} direction with a premium, cohesive material palette informed by the existing furniture and lighting.`,
    fusionPrompt: hasMultipleDistinctStyles(args.style, args.styleSelections)
      ? `Blend ${joinNaturalLanguage(dedupeSuggestions([args.style, ...(args.styleSelections ?? [])], args.style))} into one cohesive architectural language with balanced materials, detailing, and color transitions that feel intentional rather than themed.`
      : undefined,
    reason: "Fallback style direction selected for a cohesive redesign.",
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

async function requestGeminiDesignOrchestration(args: {
  sourceBlob: Blob;
  serviceType: ServiceType;
  roomType: string;
  style: string;
  styleSelections?: string[];
  colorPalette?: string;
  availableStyles?: string[];
  availablePalettes?: string[];
}) {
  const fallback = buildFallbackOrchestration({
    serviceType: args.serviceType,
    roomType: args.roomType,
    style: args.style,
    styleSelections: args.styleSelections,
    colorPalette: args.colorPalette,
  });
  const apiKey = trimOptional(process.env.GEMINI_API_KEY);
  const model = trimOptional(process.env.GEMINI_TEXT_MODEL) ?? "gemini-3.1-pro-preview";

  if (!apiKey) {
    return fallback;
  }

  const { base64, mimeType } = await prepareSuggestionImage(args.sourceBlob);
  const styleDirection = buildStyleDirection(args.style, args.styleSelections);
  const requestShape =
    args.serviceType === "paint"
      ? '{"style":"...","wallColor":"...","reason":"..."}'
      : args.serviceType === "floor"
        ? '{"style":"...","floorMaterial":"...","reason":"..."}'
        : '{"style":"...","styles":["...","..."],"paletteId":"...","fusionPrompt":"...","reason":"..."}';
  const taskInstruction =
    args.serviceType === "paint"
      ? "Analyze the room's current furniture, lighting, and materials, then choose the best professional wall color for a premium final result."
      : args.serviceType === "floor"
        ? "Analyze the room's current furniture, lighting, and materials, then choose the best professional floor material and finish for a premium final result."
        : "Analyze this uploaded room, house, facade, or garden image and recommend the single strongest architectural direction plus the strongest palette direction for a premium final result. If multiple styles were provided, resolve them into a refined fusion rather than a list of disconnected themes.";

  const prompt = [
    "You are a world-class architect. Analyze the provided room or house structure, lighting, and existing furniture. Automatically select the SINGLE best architectural style and color palette that will maximize the room's beauty.",
    `Service type: ${args.serviceType}.`,
    `Room type: ${args.roomType}.`,
    `Current desired direction: ${styleDirection}.`,
    args.availableStyles?.length ? `Allowed styles: ${args.availableStyles.join(", ")}.` : undefined,
    args.availablePalettes?.length ? `Allowed palettes: ${args.availablePalettes.join(", ")}.` : undefined,
    taskInstruction,
    args.serviceType === "redesign" ? "Return a single best style in style. If the user supplied multiple styles, keep styles limited to the compatible fusion ingredients and write fusionPrompt as a polished architectural direction that blends them seamlessly." : undefined,
    "If the user selected AI Suggest, Surprise Me, AI Choice, or Random, you must still return a professionally balanced, high-end choice rather than something extreme.",
    `Return strict JSON in the shape ${requestShape} with no markdown and no extra text.`,
  ]
    .filter(Boolean)
    .join(" ");

  try {
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
      console.error("requestGeminiDesignOrchestration: Gemini request failed", response.status, await response.text().catch(() => ""));
      return fallback;
    }

    const payload = await response.json();
    const text = parseSuggestionResponse(payload);
    if (!text) {
      return fallback;
    }

    const parsed = JSON.parse(extractJsonBlock(text)) as {
      style?: string;
      styles?: string[];
      paletteId?: string;
      wallColor?: string;
      floorMaterial?: string;
      fusionPrompt?: string;
      reason?: string;
    };

    const parsedStyles = Array.isArray(parsed.styles) ? parsed.styles : [];
    const normalizedStyles = dedupeSuggestions(
      [trimOptional(parsed.style) ?? fallback.style, ...parsedStyles],
      fallback.style,
    ).slice(0, 3);

    return {
      style: normalizedStyles[0] ?? trimOptional(parsed.style) ?? fallback.style,
      styles: normalizedStyles,
      paletteId: trimOptional(parsed.paletteId) ?? fallback.paletteId,
      wallColor: trimOptional(parsed.wallColor) ?? fallback.wallColor,
      floorMaterial: trimOptional(parsed.floorMaterial) ?? fallback.floorMaterial,
      customPrompt: fallback.customPrompt,
      fusionPrompt: trimOptional(parsed.fusionPrompt) ?? fallback.fusionPrompt,
      reason: trimOptional(parsed.reason) ?? fallback.reason,
      source: "gemini" as const,
    } satisfies DesignOrchestrationResult;
  } catch (error) {
    console.error("requestGeminiDesignOrchestration: falling back after error", error);
    return fallback;
  }
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
    const sourceBlob = await ctx.storage.get(args.imageStorageId);
    if (!sourceBlob) {
      return fallback;
    }

    try {
      const parsed = await requestGeminiDesignOrchestration({
        sourceBlob,
        serviceType: args.serviceType,
        roomType: args.roomType,
        style: fallback.style,
        colorPalette: fallback.paletteId,
        availableStyles: args.availableStyles,
        availablePalettes: args.availablePalettes,
      });

      return {
        style: normalizeSuggestionChoice(parsed.style, args.availableStyles, fallback.style),
        styles: dedupeSuggestions(
          (parsed.styles ?? []).map((style) => normalizeSuggestionChoice(style, args.availableStyles, fallback.style)),
          normalizeSuggestionChoice(parsed.style, args.availableStyles, fallback.style),
        ).slice(0, 3),
        paletteId: normalizeSuggestionChoice(parsed.paletteId, args.availablePalettes, fallback.paletteId),
        reason: trimOptional(parsed.reason) ?? fallback.reason,
        source: parsed.source,
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
    aiSuggestedStyle: v.optional(v.string()),
    aiSuggestedPaletteId: v.optional(v.string()),
    regenerate: v.optional(v.boolean()),
    smartSuggest: v.optional(v.boolean()),
    speedTier: v.optional(v.union(v.literal("standard"), v.literal("pro"), v.literal("ultra"))),
    planUsed: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; storageId: string; imageUrl: string | null }> => {
    const apiKey = trimOptional(process.env.AZURE_OPENAI_API_KEY);
    const endpoint = trimOptional(process.env.AZURE_OPENAI_ENDPOINT);
    const deploymentName = trimOptional(process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
    console.log("generateDesign: Azure configuration", {
      apiKeyPresent: Boolean(apiKey),
      apiKeyPreview: redactSecret(apiKey),
      deploymentName: deploymentName ?? null,
      endpoint: endpoint ? normalizeAzureEndpoint(endpoint) : null,
      generationId: args.generationId,
      serviceType: args.serviceType,
    });
    if (!apiKey || !endpoint || !deploymentName) {
      const missingVariable = !apiKey
        ? "AZURE_OPENAI_API_KEY"
        : !endpoint
          ? "AZURE_OPENAI_ENDPOINT"
          : "AZURE_OPENAI_DEPLOYMENT_NAME";
      const message = normalizeGenerationError(`Missing ${missingVariable} in Convex environment variables.`);
      await ctx.runMutation((internal as any).generations.markGenerationFailed, {
        generationId: args.generationId,
        ownerId: args.ownerId,
        errorMessage: message,
      });
      throw new ConvexError(message);
    }

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

      console.log("generateDesign: loaded assets", {
        generationId: args.generationId,
        hasMask: Boolean(maskBlob),
        hasReferenceImages: Boolean(args.referenceImageStorageIds?.length),
        promptSource: args.smartSuggest ? "smartSuggest" : "manual",
        serviceType: args.serviceType,
      });

      const normalizedAssets = await normalizeImagesForAzure({
        sourceBlob,
        maskBlob,
      });

      const renderProfile = resolveAzureRenderProfile({
        endpoint,
        deploymentName,
        planUsed: trimOptional(args.planUsed),
        speedTier: (args.speedTier as SpeedTier | undefined) ?? "standard",
      });
      console.log("generateDesign: resolved Azure endpoints", {
        editEndpoint: renderProfile.editEndpoint,
        generationEndpoint: renderProfile.generationEndpoint,
        generationId: args.generationId,
      });

      const orchestratedDirection =
        (args.smartSuggest || (args.serviceType === "redesign" && hasMultipleDistinctStyles(args.style, args.styleSelections)))
          ? await requestGeminiDesignOrchestration({
              sourceBlob,
              serviceType: args.serviceType,
              roomType: args.roomType,
              style: args.style,
              styleSelections: args.styleSelections,
              colorPalette: args.colorPalette,
            })
          : null;
      const resolvedStyle = trimOptional(orchestratedDirection?.style) ?? args.style;
      const resolvedPalette = trimOptional(orchestratedDirection?.paletteId) ?? args.colorPalette;
      const resolvedTargetColor = trimOptional(orchestratedDirection?.wallColor) ?? args.targetColor;
      const orchestrationPrompt = trimOptional(orchestratedDirection?.customPrompt);
      const orchestrationReason = trimOptional(orchestratedDirection?.reason);
      const resolvedCustomPrompt = compactPromptSegments([
        args.customPrompt,
        args.serviceType === "paint" && orchestratedDirection?.wallColor
          ? `Primary wall color recommendation: ${orchestratedDirection.wallColor}.`
          : undefined,
        args.serviceType === "floor" && orchestratedDirection?.floorMaterial
          ? `Primary flooring recommendation: ${orchestratedDirection.floorMaterial}.`
          : undefined,
        args.serviceType === "redesign" && orchestratedDirection?.fusionPrompt
          ? `Fusion design brief: ${orchestratedDirection.fusionPrompt}.`
          : undefined,
        args.serviceType === "redesign" && orchestrationReason
          ? `Design direction rationale: ${orchestrationReason}.`
          : undefined,
        orchestrationPrompt,
      ]);

      const resolvedStyleSelections =
        args.serviceType === "redesign"
          ? dedupeSuggestions(
              [resolvedStyle, ...(orchestratedDirection?.styles ?? args.styleSelections ?? [])],
              resolvedStyle,
            )
          : args.styleSelections;

      const optimizedPrompt = buildPrompt({
        serviceType: args.serviceType,
        roomType: args.roomType,
        style: resolvedStyle,
        styleSelections: resolvedStyleSelections,
        colorPalette: resolvedPalette,
        customPrompt: resolvedCustomPrompt,
        targetColor: resolvedTargetColor,
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

      const generatedBase64 = await runAzureImageGeneration({
        apiKey,
        prompt: optimizedPrompt,
        negativePrompt,
        sourceBlob: normalizedAssets.sourceBlob,
        maskBlob: args.serviceType === "redesign" ? null : normalizedAssets.maskBlob!,
        renderProfile,
      });

      const bytes = decodeBase64ToBytes(generatedBase64);
      const imageBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      let outputBlob = new Blob([imageBuffer], { type: "image/png" });

      if (renderProfile.watermarkRequired) {
        outputBlob = await limitFreeImageResolution(outputBlob);
        outputBlob = await applyHomeDecorWatermark(outputBlob);
      }

      console.log("generateDesign: Azure generation completed", {
        generationId: args.generationId,
        watermarkRequired: renderProfile.watermarkRequired,
        outputMimeType: outputBlob.type,
      });
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
      const rawMessage = error instanceof Error ? error.message : "Generation failed.";
      const friendlyMessage = normalizeGenerationError(rawMessage);
      console.error("generateDesign: generation failed", {
        generationId: args.generationId,
        message: rawMessage,
        friendlyMessage,
        serviceType: args.serviceType,
      });
      if (generatedStorageId) {
        await ctx.storage.delete(generatedStorageId as any);
      }

      await ctx.runMutation((internal as any).generations.markGenerationFailed, {
        generationId: args.generationId,
        ownerId: args.ownerId,
        errorMessage: rawMessage,
      });
      throw new ConvexError(rawMessage);
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
