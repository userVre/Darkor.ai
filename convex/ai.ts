import { actionGeneric, internalMutationGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  buildDesignPrompt,
} from "../lib/design-prompt-builder";

const GEMINI_SUGGEST_REQUEST_TIMEOUT_MS = 25_000;
const GEMINI_SUGGEST_MAX_DIMENSION = 1152;
const GEMINI_SUGGEST_MAX_INLINE_BYTES = 3 * 1024 * 1024;
const AI_PROVIDER_DOWN = "AI_PROVIDER_DOWN";

type ServiceType = "paint" | "floor" | "redesign" | "layout";

type DetectionPoint = {
  x: number;
  y: number;
};

type DetectionResponse = {
  confidence: number;
  polygons: DetectionPoint[][];
  reason?: string | null;
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

export function redactSecret(value?: string | null) {
  const normalized = trimOptional(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length <= 8) {
    return "***";
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

export function trimOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
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
  if (originalBytes.byteLength > GEMINI_SUGGEST_MAX_INLINE_BYTES) {
    console.warn("prepareSuggestionImage: image exceeds inline target size; sending original bytes without Jimp optimization", {
      byteLength: originalBytes.byteLength,
      targetLimit: GEMINI_SUGGEST_MAX_INLINE_BYTES,
      maxDimensionHint: GEMINI_SUGGEST_MAX_DIMENSION,
    });
  }

  return {
    base64: await blobToBase64(blob),
    mimeType: blob.type || "image/jpeg",
  };
}

export function normalizeGenerationError(message?: string | null) {
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
    return "Design could not be generated due to content safety guidelines. Please try a different photo.";
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

export function dedupeSuggestions(values: Array<string | undefined>, fallback?: string) {
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

export function hasMultipleDistinctStyles(style: string, styleSelections?: string[]) {
  const normalized = dedupeSuggestions([style, ...(styleSelections ?? [])], style);
  return normalized.length > 1;
}

export function compactPromptSegments(parts: Array<string | undefined>) {
  return parts
    .map((part) => trimOptional(part))
    .filter((part): part is string => Boolean(part))
    .join(" ");
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
  return buildDesignPrompt({
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

async function applyHomeDecorWatermark(blob: Blob) {
  return blob;
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
  return blob;
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

  if (args.serviceType === "layout") {
    return {
      style: "Spatial Optimization",
      customPrompt: "Re-arrange furniture to gain more space and fluid circulation while preserving the architecture, fixed openings, and room structure.",
      reason: "Fallback spatial optimization selected for stronger comfort and circulation.",
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

export async function requestGeminiDesignOrchestration(args: {
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
        : args.serviceType === "layout"
          ? '{"style":"...","customPrompt":"...","reason":"..."}'
        : '{"style":"...","styles":["...","..."],"paletteId":"...","fusionPrompt":"...","reason":"..."}';
  const taskInstruction =
    args.serviceType === "paint"
      ? "Analyze the room's current furniture, lighting, and materials, then choose the best professional wall color for a premium final result."
      : args.serviceType === "floor"
        ? "Analyze the room's current furniture, lighting, and materials, then choose the best professional floor material and finish for a premium final result."
        : args.serviceType === "layout"
          ? "Analyze the room's current furniture, circulation paths, and architectural shell, then propose the best professional furniture rearrangement strategy for a premium final result."
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
      customPrompt?: string;
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
      customPrompt: trimOptional(parsed.customPrompt) ?? fallback.customPrompt,
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
    await ctx.runMutation((internal as any).generations.finalizeGenerationSuccess, {
      ownerId: generation.userId,
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
