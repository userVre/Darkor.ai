import { actionGeneric, internalMutationGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  ARCHITECTURAL_MATERIAL_REFLECTION_INSTRUCTION,
  buildDesignPrompt,
  GLOBAL_MASTERPIECE_QUALITY_INSTRUCTION,
  GLOBAL_PERSPECTIVE_LOCK_INSTRUCTION,
} from "../lib/design-prompt-builder";

const AZURE_BRAIN_REQUEST_TIMEOUT_MS = 25_000;
const AZURE_BRAIN_MAX_DIMENSION = 1152;
const AZURE_BRAIN_MAX_INLINE_BYTES = 3 * 1024 * 1024;
const AZURE_BRAIN_API_VERSION = "2024-10-21";
const AZURE_BRAIN_DEFAULT_ENDPOINT = "https://abism-moec40fn-eastus2.cognitiveservices.azure.com/";
const AZURE_BRAIN_DEFAULT_DEPLOYMENT_NAME = "gpt-image-2";
const AI_PROVIDER_DOWN = "AI_PROVIDER_DOWN";
export const IMAGE_PROCESSING_REJECTION_MESSAGE =
  "Cette image ne peut pas être traitée. Essayez avec une photo d'intérieur ou une autre image.";

type ServiceType = "paint" | "floor" | "redesign" | "layout" | "replace";

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
  source: "azure" | "fallback";
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
  if (originalBytes.byteLength > AZURE_BRAIN_MAX_INLINE_BYTES) {
    console.warn("prepareSuggestionImage: image exceeds inline target size; sending original bytes without Jimp optimization", {
      byteLength: originalBytes.byteLength,
      targetLimit: AZURE_BRAIN_MAX_INLINE_BYTES,
      maxDimensionHint: AZURE_BRAIN_MAX_DIMENSION,
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
    normalized.includes("policy_violation") ||
    normalized.includes("moderation_blocked") ||
    normalized.includes("safety system") ||
    normalized.includes("safety") ||
    normalized.includes("moderation")
  ) {
    return IMAGE_PROCESSING_REJECTION_MESSAGE;
  }

  if (normalized.includes("unable to prepare free-tier image safely")) {
    return IMAGE_PROCESSING_REJECTION_MESSAGE;
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
  targetColorCategory?: string;
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
    targetColorCategory: args.targetColorCategory,
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

function clampDetectionConfidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
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

function normalizeDetectionResponse(value: any, fallback: DetectionResponse): DetectionResponse {
  const rawPolygons = Array.isArray(value?.polygons) ? value.polygons : [];
  const polygons = rawPolygons
    .map((polygon: any) => {
      if (!Array.isArray(polygon)) {
        return [];
      }

      return polygon
        .map((point: any) => ({
          x: clampDetectionCoordinate(Number(point?.x)),
          y: clampDetectionCoordinate(Number(point?.y)),
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    })
    .filter((polygon: DetectionPoint[]) => polygon.length >= 3);

  if (polygons.length === 0) {
    return fallback;
  }

  return {
    confidence: clampDetectionConfidence(Number(value?.confidence ?? fallback.confidence)),
    polygons,
    reason: trimOptional(value?.reason) ?? fallback.reason ?? null,
  };
}

async function requestAzureVisionDetection(args: {
  sourceBlob: Blob;
  target: "paint" | "floor";
}) {
  const fallback = heuristicDetection(args.target);
  const targetInstruction = args.target === "paint"
    ? "Detect the visible paintable wall planes. Exclude windows, doors, art, mirrors, furniture, decor, ceiling, floor, and trim unless trim is visibly part of the wall paint area."
    : "Detect the visible floor plane. Exclude rugs, furniture, walls, steps above floor level, decor, and any vertical surfaces.";
  const systemPrompt = [
    "You are GPT-4o acting as an architectural vision detector for precise interior image editing.",
    "Return normalized polygon coordinates on a 0-1000 coordinate grid, where x=0 is the left edge, x=1000 is the right edge, y=0 is the top edge, and y=1000 is the bottom edge.",
    "Use simple polygons that follow the actual visible perspective boundaries. Favor conservative polygons over bleeding into furniture or unrelated surfaces.",
    "Return only strict JSON.",
  ].join(" ");
  const userPrompt = [
    targetInstruction,
    "Analyze lighting, perspective, occlusion, wall-floor intersections, furniture contact points, and visible material boundaries.",
    "Return JSON exactly in this shape: {\"confidence\":0-100,\"polygons\":[[{\"x\":0,\"y\":0},{\"x\":0,\"y\":0},{\"x\":0,\"y\":0}]],\"reason\":\"brief visual rationale\"}.",
  ].join(" ");

  const parsed = await requestAzureBrainJson({
    sourceBlob: args.sourceBlob,
    systemPrompt,
    userPrompt,
    maxTokens: 900,
    temperature: 0.1,
  });

  return parsed ? normalizeDetectionResponse(parsed, fallback) : fallback;
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
      customPrompt: `Use ${balancedWallColor} as the professionally balanced specific wall shade within a warm neutral color family after analyzing the room's current furniture, window-light direction, shadows, and materials. Preserve furniture shadows on the wall and keep all non-wall surfaces unchanged.`,
      reason: "Fallback balanced wall color selected for a high-end result.",
      source: "fallback" as const,
    };
  }

  if (args.serviceType === "floor") {
    return {
      style: styleDirection,
      floorMaterial: balancedFloorMaterial,
      customPrompt: `Use ${balancedFloorMaterial} as the professionally balanced flooring material after analyzing the room's furniture, lighting, and perspective. Align grain, seams, or stone veining with the source vanishing lines and preserve furniture grounding and contact shadows.`,
      reason: "Fallback balanced floor material selected for a high-end result.",
      source: "fallback" as const,
    };
  }

  if (args.serviceType === "layout") {
    return {
      style: "Spatial Optimization",
      customPrompt: "Analyze current furniture placement. Rearrange to maximize floor area and circulation. The result must feel spacious, ergonomic, and breathable while keeping windows, doors, fixed openings, floor level, ceiling height, and room structure in their original places.",
      reason: "Fallback spatial optimization selected for stronger comfort and circulation.",
      source: "fallback" as const,
    };
  }

  if (args.serviceType === "replace") {
    return {
      style: "Object Replacement",
      customPrompt: "Replace the masked object with a refined alternative that matches the room's perspective, light, scale, contact shadows, ambient occlusion, and surface reflections while preserving everything outside the mask.",
      reason: "Fallback object replacement selected for a seamless masked edit.",
      source: "fallback" as const,
    };
  }

  return {
    style: styleDirection,
    styles: dedupeSuggestions([args.style, ...(args.styleSelections ?? [])], args.style),
    paletteId: trimOptional(args.colorPalette) ?? "surprise",
    customPrompt: `Resolve the space using a refined ${styleDirection} architectural direction with a premium, cohesive material palette informed by the existing furniture, source window-light direction, circulation, and structural boundaries.`,
    fusionPrompt: hasMultipleDistinctStyles(args.style, args.styleSelections)
      ? `Blend ${joinNaturalLanguage(dedupeSuggestions([args.style, ...(args.styleSelections ?? [])], args.style))} into one cohesive architectural language with balanced materials, detailing, and color transitions that feel intentional rather than themed.`
      : undefined,
    reason: "Fallback style direction selected for a cohesive redesign.",
    source: "fallback" as const,
  };
}

function ensureAzureEndpointPrefix(endpoint: string) {
  const trimmed = endpoint.trim();
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function getAzureBrainConfig() {
  const apiKey = trimOptional(process.env.AZURE_OPENAI_API_KEY);
  const endpoint = trimOptional(process.env.AZURE_OPENAI_ENDPOINT) ?? AZURE_BRAIN_DEFAULT_ENDPOINT;
  const deploymentName =
    trimOptional(process.env.AZURE_OPENAI_BRAIN_DEPLOYMENT_NAME) ??
    trimOptional(process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_NAME) ??
    trimOptional(process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT_NAME) ??
    AZURE_BRAIN_DEFAULT_DEPLOYMENT_NAME;
  const apiVersion = trimOptional(process.env.AZURE_OPENAI_CHAT_API_VERSION) ?? AZURE_BRAIN_API_VERSION;

  return apiKey
    ? {
        apiKey,
        endpoint,
        deploymentName,
        apiVersion,
      }
    : null;
}

async function parseAzureBrainError(response: Response) {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw) as {
      error?: {
        code?: string;
        message?: string;
        inner_error?: { code?: string };
      };
      message?: string;
    };

    return [
      parsed.error?.code,
      parsed.error?.inner_error?.code,
      parsed.error?.message,
      parsed.message,
    ]
      .filter(Boolean)
      .join(" | ") || raw;
  } catch {
    return raw;
  }
}

function parseAzureBrainText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return trimOptional(content);
  }

  if (Array.isArray(content)) {
    return trimOptional(
      content
        .map((part) => {
          if (typeof part === "string") return part;
          if (typeof part?.text === "string") return part.text;
          return "";
        })
        .join(""),
    );
  }

  return undefined;
}

async function requestAzureBrainJson(args: {
  sourceBlob: Blob;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature?: number;
}) {
  const config = getAzureBrainConfig();
  if (!config) {
    return null;
  }

  const { base64, mimeType } = await prepareSuggestionImage(args.sourceBlob);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AZURE_BRAIN_REQUEST_TIMEOUT_MS);
  const requestUrl =
    `${ensureAzureEndpointPrefix(config.endpoint)}openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: args.systemPrompt,
          },
          {
            role: "user",
            content: [
              { type: "text", text: args.userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        temperature: args.temperature ?? 0.25,
        max_tokens: args.maxTokens,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("requestAzureBrainJson: Azure GPT-4o request failed", response.status, await parseAzureBrainError(response));
      return null;
    }

    const payload = await response.json();
    const text = parseAzureBrainText(payload);
    if (!text) {
      return null;
    }

    return JSON.parse(extractJsonBlock(text));
  } catch (error) {
    console.error("requestAzureBrainJson: falling back after error", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestAzureDesignOrchestration(args: {
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
  const styleDirection = buildStyleDirection(args.style, args.styleSelections);
  const requestShape =
    args.serviceType === "paint"
      ? '{"style":"...","wallColor":"...","customPrompt":"...","reason":"..."}'
      : args.serviceType === "floor"
        ? '{"style":"...","floorMaterial":"...","customPrompt":"...","reason":"..."}'
        : args.serviceType === "layout"
          ? '{"style":"...","customPrompt":"...","reason":"..."}'
        : args.serviceType === "replace"
          ? '{"style":"...","customPrompt":"...","reason":"..."}'
        : '{"style":"...","styles":["...","..."],"paletteId":"...","fusionPrompt":"...","customPrompt":"...","reason":"..."}';
  const taskInstruction =
    args.serviceType === "paint"
      ? "Analyze the room's current furniture, lighting direction, wall planes, and materials, then choose the best professional wall color. In customPrompt, distinguish the broad color family from the exact shade and require preserved furniture shadows on the wall."
      : args.serviceType === "floor"
        ? "Analyze the room's current furniture, lighting, perspective lines, and materials, then choose the best professional floor material and finish. In customPrompt, specify material depth and how grain, veins, seams, or plank direction follow the source perspective."
        : args.serviceType === "layout"
          ? "Analyze current furniture placement, circulation paths, and architectural shell. In customPrompt, produce a spacious, ergonomic, breathable rearrangement strategy that maximizes usable floor area while keeping windows and doors in their original places."
        : args.serviceType === "replace"
          ? "Analyze the room's perspective, lighting, contact shadows, and surrounding furniture. In customPrompt, describe the most seamless replacement object strategy so the new object inherits shadows, reflections, scale, and color temperature."
        : "Analyze this uploaded room, house, facade, or garden image and recommend the strongest architectural direction plus the strongest palette direction for a premium final result. Translate user style words into architectural language, for example Modern becomes contemporary minimalist with warm oak accents, layered indirect lighting, and clean floor-to-ceiling surfaces. If multiple styles were provided, resolve them into a refined fusion rather than a list of disconnected themes.";

  const systemPrompt = [
    "You are GPT-4o acting as the unified HomeDecor AI brain: architectural vision analyst, interior design director, and technical prompt engineer.",
    "Analyze the uploaded room photo before making any recommendation. Prioritize architectural precision over generic decoration.",
    "Ground every decision in the visible camera angle, room geometry, natural light direction, surface materials, furniture scale, and luxury finish quality.",
    "Return only strict JSON. Do not include markdown, prose outside JSON, visible text instructions, labels, captions, watermarks, or split layouts.",
  ].join(" ");
  const prompt = [
    "Analyze the provided room, facade, garden, structure, lighting, and existing furniture. Select the SINGLE strongest professional design direction and translate simple user choices into precise architectural language.",
    GLOBAL_PERSPECTIVE_LOCK_INSTRUCTION,
    GLOBAL_MASTERPIECE_QUALITY_INSTRUCTION,
    `Service type: ${args.serviceType}.`,
    `Room type: ${args.roomType}.`,
    `Current desired direction: ${styleDirection}.`,
    args.availableStyles?.length ? `Allowed styles: ${args.availableStyles.join(", ")}.` : undefined,
    args.availablePalettes?.length ? `Allowed palettes: ${args.availablePalettes.join(", ")}.` : undefined,
    taskInstruction,
    ARCHITECTURAL_MATERIAL_REFLECTION_INSTRUCTION,
    "Architectural precision requirements: describe exact lighting behavior, color temperature, shadow softness, surface reflectivity, material grain direction, stone veining, metal finish, glass reflections, textile weight, joinery lines, and luxury detailing.",
    args.serviceType === "redesign" ? "Return a single best style in style. If the user supplied multiple styles, keep styles limited to the compatible fusion ingredients and write fusionPrompt as a polished architectural direction that blends them seamlessly." : undefined,
    args.serviceType === "redesign" ? "For interiors, focus customPrompt on lighting harmony, furniture flow, spatial gain, high-fidelity textures, and preserving source window light direction. For exteriors, require a clean sweep of debris, trash, foreground clutter, and messy overgrowth, then replace with luxury landscaping and a polished facade. For gardens, require resort-level landscaping with lush tropical flora, integrated LED garden lighting, and ambient twilight atmosphere where appropriate. If the photo includes both facade and garden, treat them as one unified project." : undefined,
    "If the user selected AI Suggest, Surprise Me, AI Choice, or Random, you must still return a professionally balanced, high-end choice rather than something extreme.",
    "Do not include any instructions to add visible text, labels, captions, watermarks, comparison labels, or split layouts in the generated image.",
    "Every customPrompt must be a final descriptive architectural rendering prompt, not a repetition of the user's short choice.",
    `Return strict JSON in the shape ${requestShape} with no markdown and no extra text.`,
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const parsed = await requestAzureBrainJson({
      sourceBlob: args.sourceBlob,
      systemPrompt,
      userPrompt: prompt,
      maxTokens: 1300,
      temperature: 0.25,
    }) as {
      style?: string;
      styles?: string[];
      paletteId?: string;
      wallColor?: string;
      floorMaterial?: string;
      customPrompt?: string;
      fusionPrompt?: string;
      reason?: string;
    } | null;

    if (!parsed) {
      return fallback;
    }

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
      source: "azure" as const,
    } satisfies DesignOrchestrationResult;
  } catch (error) {
    console.error("requestAzureDesignOrchestration: falling back after error", error);
    return fallback;
  }
}

export const suggestDesignOptions: any = actionGeneric({
  args: {
    imageStorageId: v.id("_storage"),
    serviceType: v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign"), v.literal("layout"), v.literal("replace")),
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
      const parsed = await requestAzureDesignOrchestration({
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
    if (!imageUrl) {
      throw new ConvexError("Generated image URL could not be resolved.");
    }

    await ctx.db.patch(args.generationId, {
      storageId: args.storageId,
      imageUrl,
      status: "ready",
      errorMessage: undefined,
      completedAt: Date.now(),
    });
    await ctx.runMutation((internal as any).generations.finalizeGenerationSuccess, {
      ownerId: generation.userId,
      generationId: args.generationId,
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
  handler: async (ctx, args) => {
    const fallback = heuristicDetection(args.target);
    const sourceBlob = await ctx.storage.get(args.imageStorageId);
    const detection = sourceBlob
      ? await requestAzureVisionDetection({
          sourceBlob,
          target: args.target,
        })
      : fallback;

    return {
      confidence: clampDetectionConfidence(detection.confidence),
      polygons: detection.polygons.map((polygon) =>
        polygon.map((point) => ({
          x: clampDetectionCoordinate(point.x),
          y: clampDetectionCoordinate(point.y),
        })),
      ),
      reason: trimOptional(detection.reason) ?? null,
    };
  },
});
