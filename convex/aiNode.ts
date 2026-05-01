"use node";

import { experimental_generateImage, APICallError } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { internalActionGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  compactPromptSegments,
  dedupeSuggestions,
  normalizeGenerationError,
  redactSecret,
  requestGeminiDesignOrchestration,
  trimOptional,
} from "./ai";
import {
  buildDesignNegativePrompt,
  buildDesignPrompt,
  GLOBAL_MASTERPIECE_QUALITY_INSTRUCTION,
  GLOBAL_PERSPECTIVE_LOCK_INSTRUCTION,
} from "../lib/design-prompt-builder";

const AZURE_IMAGE_API_VERSION = "2025-04-01-preview";
const AZURE_IMAGE_REQUEST_TIMEOUT_MS = 90_000;
const AZURE_IMAGE_DEPLOYMENT_NAME = "gpt-image-1";
const AZURE_GEOMETRIC_ADHERENCE_SYSTEM_PROMPT =
  `${GLOBAL_PERSPECTIVE_LOCK_INSTRUCTION} STRICT PERSPECTIVE LOCK: You are an AI Architect. The output image MUST align pixel-for-pixel with the source image's structural boundaries. Do not change the horizon line, the floor level, the ceiling height, the camera angle, or the focal length. Redesign furniture, textures, lighting, landscaping, and decor only inside the existing pixel-grid boundaries. Generate one clean full-frame design image only: no text overlays, no captions, no labels, no watermarks, no comparison layout. ${GLOBAL_MASTERPIECE_QUALITY_INSTRUCTION}`;
const AZURE_EXTERIOR_PERSPECTIVE_LOCK_PROMPT =
  "EXTERIOR AND GARDEN PERSPECTIVE LOCK: Process the entire property frame, including the facade, driveway, entry, garden, and foreground landscape, but keep the building massing, rooflines, openings, site placement, horizon line, grade, and lens perspective locked exactly to the source image so the generated image overlays cleanly in the slider.";
const EXTERIOR_ROOM_TYPE_KEYWORDS = [
  "apartment",
  "house",
  "office building",
  "office",
  "villa",
  "residential",
  "retail",
  "facade",
  "façade",
] as const;

const GARDEN_ROOM_TYPE_KEYWORDS = [
  "garden",
  "backyard",
  "front yard",
  "yard",
  "patio",
  "pool",
  "terrace",
  "deck",
  "courtyard",
  "landscape",
  "lawn",
  "outdoor",
] as const;

type ServiceType = "paint" | "floor" | "redesign" | "layout" | "replace";
type RequestedServiceType = ServiceType | "wall" | "transfer" | "reference";
type SpeedTier = "standard" | "pro" | "ultra";
type AzureRenderSize = "1024x1024" | "1024x1536" | "1536x1024";
type GenerationQualityTier = "free" | "standard_hd" | "premium";

type AzureRenderProfile = {
  deploymentName: string;
  size: AzureRenderSize;
  watermarkRequired: boolean;
};

function ensureAzureEndpointPrefix(endpoint: string) {
  const trimmed = endpoint.trim();
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function buildAzureBaseUrl(endpoint: string) {
  return `${ensureAzureEndpointPrefix(endpoint)}openai`;
}

function shouldRetryStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
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

function isExteriorRedesignContext(args: { serviceType: ServiceType; roomType: string }) {
  if (args.serviceType !== "redesign") {
    return false;
  }

  const normalizedRoomType = args.roomType.toLowerCase();
  return (
    EXTERIOR_ROOM_TYPE_KEYWORDS.some((keyword) => normalizedRoomType.includes(keyword)) ||
    GARDEN_ROOM_TYPE_KEYWORDS.some((keyword) => normalizedRoomType.includes(keyword))
  );
}

function buildAzurePrompt(args: {
  prompt: string;
  negativePrompt: string;
  serviceType: ServiceType;
  roomType: string;
  flowInstruction?: string;
}) {
  const exteriorPerspectiveLock = isExteriorRedesignContext({
    serviceType: args.serviceType,
    roomType: args.roomType,
  })
    ? `\n\n${AZURE_EXTERIOR_PERSPECTIVE_LOCK_PROMPT}`
    : "";

  return `${AZURE_GEOMETRIC_ADHERENCE_SYSTEM_PROMPT}${exteriorPerspectiveLock}\n\n${args.flowInstruction ? `${args.flowInstruction}\n\n` : ""}${args.prompt}\n\nAvoid: ${args.negativePrompt}`;
}

function buildModeSpecificInstruction(args: {
  serviceType: ServiceType;
  modeId?: string;
}) {
  if (args.serviceType === "redesign" && args.modeId === "preserve") {
    return "Analyze current furniture placement. Rearrange to maximize floor area and circulation. The result must feel spacious, ergonomic, and breathable while keeping the windows, doors, fixed openings, floor level, ceiling height, and camera geometry in their original places.";
  }

  return undefined;
}

function buildAzureFlowInstruction(args: {
  requestedServiceType?: RequestedServiceType;
  serviceType: ServiceType;
  customPrompt?: string;
  referenceImageCount: number;
}) {
  if (args.serviceType === "paint") {
    return "Automatically detect all wall planes. Apply the user's selected color family and specific shade exactly, preserving furniture shadows on the wall, original window light direction, trim, decor, and all non-wall areas.";
  }

  if (args.serviceType === "floor") {
    return "Automatically detect the floor plane. Replace only the floor finish, making wood grain, marble veins, tile seams, and material scale follow the original room's perspective lines, while preserving furniture grounding and contact shadows.";
  }

  if (args.serviceType === "replace") {
    const requestedReplacement = trimOptional(args.customPrompt) ?? "a refined replacement object";
    return `Identify the object within the marked mask and replace it with ${requestedReplacement}. The new object must inherit the original shadows, contact grounding, ambient occlusion, light reflections, scale, and perspective for a seamless blend.`;
  }

  if (
    (args.requestedServiceType === "reference" || args.requestedServiceType === "transfer")
    && args.referenceImageCount > 0
  ) {
    return "Deconstruct the aesthetic DNA of the reference image: lighting, material palette, furniture language, surface finishes, color temperature, and detailing. Re-map that aesthetic onto the source image's bones while preserving the source wall positions, openings, floor level, ceiling height, camera angle, and focal length.";
  }

  if (args.serviceType === "redesign" && args.referenceImageCount > 0) {
    const extraReferenceNote =
      args.referenceImageCount > 1
        ? " Any additional uploaded reference images should be treated as secondary inspiration references."
        : "";
    return `Use the first uploaded image as the source and the second uploaded image as the primary inspiration reference. Deconstruct the reference aesthetic DNA, including lighting, materials, color palette, furniture language, and detailing. Apply that exact style to the source room without changing the source structural layout, wall positions, openings, floor level, ceiling height, camera angle, or focal length.${extraReferenceNote}`;
  }

  return undefined;
}

function parseAspectRatio(value?: string) {
  const normalized = trimOptional(value)?.toLowerCase().replace(/\s+/g, "");
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)(?::|x|\/)(\d+(?:\.\d+)?)$/);
  if (!match) {
    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return width / height;
}

function resolveAzureImageSize(args: {
  qualityTier?: GenerationQualityTier;
  outputResolution?: string;
  aspectRatio?: string;
}) {
  const requestedSize = trimOptional(args.outputResolution);

  if (requestedSize === "1024x1024" || requestedSize === "1024x1536" || requestedSize === "1536x1024") {
    return requestedSize as AzureRenderSize;
  }

  const ratio = parseAspectRatio(args.aspectRatio);
  if (ratio && ratio >= 1.2) {
    return "1536x1024";
  }
  if (ratio && ratio <= 0.83) {
    return "1024x1536";
  }

  return "1024x1024";
}

function resolveAzureRenderProfile(args: {
  deploymentName: string;
  planUsed?: string;
  speedTier?: SpeedTier;
  qualityTier?: GenerationQualityTier;
  outputResolution?: string;
  aspectRatio?: string;
}) {
  const isPaidPlan = args.planUsed === "pro" || args.planUsed === "trial";
  const size = resolveAzureImageSize({
    qualityTier: args.qualityTier,
    outputResolution: args.outputResolution,
    aspectRatio: args.aspectRatio,
  });

  return {
    deploymentName: args.deploymentName,
    size,
    watermarkRequired: !isPaidPlan,
  } satisfies AzureRenderProfile;
}

async function parseAzureError(response: Response) {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw) as {
      error?: {
        code?: string;
        message?: string;
        inner_error?: { code?: string };
      };
      message?: string;
      details?: Array<{ code?: string; message?: string }>;
    };

    return [
      parsed.error?.code,
      parsed.error?.inner_error?.code,
      parsed.error?.message,
      parsed.message,
      ...(parsed.details ?? []).flatMap((detail) => [detail.code, detail.message]),
    ]
      .filter(Boolean)
      .join(" | ") || raw;
  } catch {
    return raw;
  }
}

function getAzureImageMimeType(blob: Blob) {
  const mimeType = trimOptional(blob.type)?.toLowerCase();
  if (mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/jpg" || mimeType === "image/webp") {
    return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  }
  return "image/png";
}

function getAzureImageFilename(blob: Blob, index: number, prefix: string) {
  const mimeType = getAzureImageMimeType(blob);
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `${prefix}-${index}.${extension}`;
}

function normalizeAzureImageBlob(blob: Blob) {
  const mimeType = getAzureImageMimeType(blob);
  return blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });
}

function createAzureMultipartFile(blob: Blob, filename: string) {
  const FileCtor = (globalThis as any).File;
  if (typeof FileCtor === "function") {
    return new FileCtor([blob], filename, { type: getAzureImageMimeType(blob) }) as Blob;
  }

  return blob;
}

function createAzureImageProvider(args: { apiKey: string; endpoint: string }) {
  return createAzure({
    apiKey: args.apiKey,
    apiVersion: AZURE_IMAGE_API_VERSION,
    baseURL: buildAzureBaseUrl(args.endpoint),
    useDeploymentBasedUrls: true,
    fetch: async (input, init) => {
      const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AZURE_IMAGE_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });

        if (!response.ok && (response.status === 401 || response.status === 429)) {
          const reason = await parseAzureError(response.clone());
          const failureReason =
            response.status === 401
              ? `Azure auth failure: ${reason || "Unauthorized"}`
              : `Azure rate limit: ${reason || "Too Many Requests"}`;

          console.error("generateDesign: Azure image request failed", {
            endpoint: requestUrl,
            reason: failureReason,
            status: response.status,
          });
        }

        return response;
      } catch (error) {
        const message =
          error instanceof Error && error.name === "AbortError"
            ? "Azure image generation request timed out."
            : error instanceof Error
              ? error.message
              : "Azure image generation request failed.";

        console.error("generateDesign: Azure image request threw", {
          endpoint: requestUrl,
          message,
        });
        throw error instanceof Error && error.name === "AbortError" ? new Error(message) : error;
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}

async function runAzureImageGeneration(args: {
  apiKey: string;
  endpoint: string;
  prompt: string;
  negativePrompt: string;
  serviceType: ServiceType;
  requestedServiceType?: RequestedServiceType;
  roomType: string;
  sourceBlob: Blob;
  referenceBlobs: Blob[];
  maskBlob?: Blob | null;
  renderProfile: AzureRenderProfile;
  targetColor?: string;
  targetColorHex?: string;
  customPrompt?: string;
}) {
  const flowInstruction = buildAzureFlowInstruction({
    requestedServiceType: args.requestedServiceType,
    serviceType: args.serviceType,
    customPrompt: args.customPrompt,
    referenceImageCount: args.referenceBlobs.length,
  });
  const composedPrompt = buildAzurePrompt({
    prompt: args.prompt,
    negativePrompt: args.negativePrompt,
    serviceType: args.serviceType,
    roomType: args.roomType,
    flowInstruction,
  });
  const sourceImages = [args.sourceBlob, ...args.referenceBlobs];
  const usesImageEditFlow = sourceImages.length > 0;

  console.log("runAzureImageGeneration: prepared Azure SDK image request", {
    baseUrl: buildAzureBaseUrl(args.endpoint),
    deploymentName: args.renderProfile.deploymentName,
    requestUrl: `${buildAzureBaseUrl(args.endpoint)}/deployments/${args.renderProfile.deploymentName}/${usesImageEditFlow ? "images/edits" : "images/generations"}?api-version=${AZURE_IMAGE_API_VERSION}`,
    hasMask: Boolean(args.maskBlob),
    maskBase64Present: Boolean(args.maskBlob),
    inputImageCount: sourceImages.length,
    flowInstruction: flowInstruction ?? null,
    size: args.renderProfile.size,
    n: 1,
    targetColor: trimOptional(args.targetColor) ?? null,
    targetColorHex: trimOptional(args.targetColorHex) ?? null,
  });

  if (usesImageEditFlow) {
    const requestUrl = `${ensureAzureEndpointPrefix(args.endpoint)}openai/deployments/${args.renderProfile.deploymentName}/images/edits?api-version=${AZURE_IMAGE_API_VERSION}`;
    const formData = new FormData();
    formData.append("prompt", composedPrompt);
    formData.append("size", args.renderProfile.size);
    formData.append("n", "1");

    const azureEditMode = args.maskBlob ? "inpainting" : "image-to-image";
    let imageFieldCount = 0;
    sourceImages.forEach((blob, index) => {
      const normalizedBlob = normalizeAzureImageBlob(blob);
      const filename = getAzureImageFilename(normalizedBlob, index, "image");
      formData.append("image", createAzureMultipartFile(normalizedBlob, filename), filename);
      imageFieldCount += 1;
    });

    if (imageFieldCount === 0) {
      throw new ConvexError("The source image could not be prepared for generation.");
    }

    if (args.maskBlob) {
      const normalizedMaskBlob = normalizeAzureImageBlob(args.maskBlob);
      const maskFilename = getAzureImageFilename(normalizedMaskBlob, 0, "mask");
      formData.append("mask", createAzureMultipartFile(normalizedMaskBlob, maskFilename), maskFilename);
    }

    console.log("runAzureImageGeneration: Azure edit multipart payload debug", {
      providerMode: azureEditMode,
      primaryImageFieldName: "image",
      imageFieldCount,
      maskFieldName: args.maskBlob ? "mask" : null,
      promptPresent: composedPrompt.length > 0,
      requestUrl,
      requestedServiceType: args.requestedServiceType ?? args.serviceType,
      serviceType: args.serviceType,
    });

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "api-key": args.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new ConvexError(await parseAzureError(response));
    }

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
    };
    const b64Json = trimOptional(payload.data?.[0]?.b64_json);
    if (!b64Json) {
      throw new ConvexError("Azure OpenAI returned no image.");
    }

    return {
      uint8Array: Uint8Array.from(Buffer.from(b64Json, "base64")),
      mediaType: "image/png",
    };
  }

  const azure = createAzureImageProvider({
    apiKey: args.apiKey,
    endpoint: args.endpoint,
  });

  const result = await experimental_generateImage({
    model: azure.image(args.renderProfile.deploymentName),
    prompt: composedPrompt,
    size: args.renderProfile.size,
    n: 1,
    maxRetries: 2,
  });

  if (result.images.length === 0) {
    throw new ConvexError("Azure OpenAI returned no image.");
  }

  return result.image;
}

async function applyHomeDecorWatermark(blob: Blob) {
  try {
    const imageBuffer = await blobToJimpBuffer(blob, "applyHomeDecorWatermark");
    if (!imageBuffer) {
      return blob;
    }

    const jimpModule = (await import("jimp-compact")) as any;
    const Jimp = jimpModule.default ?? jimpModule;
    const image = await Jimp.read(imageBuffer);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const margin = Math.max(24, Math.round(Math.min(width, height) * 0.035));
    const boxHeight = Math.max(52, Math.round(height * 0.075));
    const overlayTop = height - boxHeight - margin;

    image.scan(0, overlayTop, width, boxHeight + margin, (_x: number, y: number, index: number) => {
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
  } catch (error) {
    console.error("applyHomeDecorWatermark: failed, returning original blob", {
      message: error instanceof Error ? error.message : "Unknown watermark error",
    });
    return blob;
  }
}

async function limitFreeImageResolution(blob: Blob) {
  try {
    const FREE_MAX_DIMENSION = 1080;
    const imageBuffer = await blobToJimpBuffer(blob, "limitFreeImageResolution");
    if (!imageBuffer) {
      return blob;
    }
    const jimpModule = (await import("jimp-compact")) as any;
    const Jimp = jimpModule.default ?? jimpModule;
    const image = await Jimp.read(imageBuffer);
    image.scaleToFit(FREE_MAX_DIMENSION, FREE_MAX_DIMENSION);
    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
    return new Blob([buffer], { type: "image/png" });
  } catch (error) {
    console.error("limitFreeImageResolution: failed, returning original blob", {
      message: error instanceof Error ? error.message : "Unknown resize error",
    });
    return blob;
  }
}

async function blobToJimpBuffer(blob: Blob, caller: string) {
  const arrayBuffer = await blob.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);
  if (rawBytes.byteLength === 0) {
    console.warn(`${caller}: empty image data, returning original blob`);
    return null;
  }

  const rawBuffer = Buffer.from(rawBytes);
  const rawText = rawBuffer.toString("utf8").trim();

  if (rawText.startsWith("data:") || looksLikeBase64(rawText)) {
    const decoded = decodeBase64ImageBuffer(rawText, caller);
    if (decoded) {
      return decoded;
    }
  }

  return rawBuffer;
}

function decodeBase64ImageBuffer(imageData: string, caller: string) {
  const normalized = imageData.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
  if (!normalized) {
    console.warn(`${caller}: missing base64 image data, returning original blob`);
    return null;
  }

  try {
    const decoded = Buffer.from(normalized, "base64");
    if (decoded.byteLength > 0) {
      return decoded;
    }
    console.warn(`${caller}: decoded base64 image buffer was empty, returning original blob`);
    return null;
  } catch (error) {
    console.warn(`${caller}: failed to decode base64 image payload, falling back to raw bytes`, {
      message: error instanceof Error ? error.message : "Unknown base64 decode error",
    });
    return null;
  }
}

function looksLikeBase64(value: string) {
  if (value.length < 32 || value.length % 4 !== 0) {
    return false;
  }

  return /^[A-Za-z0-9+/=\r\n]+$/.test(value);
}

function getAzureFailureMessage(error: unknown) {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    const responseBody = trimOptional(error.responseBody);
    const exactReason = responseBody ?? error.message;

    if (status === 401) {
      console.error("generateDesign: Azure auth failure", {
        reason: exactReason,
        status,
      });
      return `Azure auth failure: ${exactReason}`;
    }

    if (status === 429) {
      console.error("generateDesign: Azure rate limit failure", {
        reason: exactReason,
        status,
      });
      return `Azure rate limit: ${exactReason}`;
    }

    if (status && shouldRetryStatus(status)) {
      return "AI_PROVIDER_DOWN";
    }

    return exactReason;
  }

  const message = error instanceof Error ? error.message : "Generation failed.";
  return message;
}

export const generateDesign: any = internalActionGeneric({
  args: {
    generationId: v.id("generations"),
    ownerId: v.string(),
    imageStorageId: v.id("_storage"),
    referenceImageStorageIds: v.optional(v.array(v.id("_storage"))),
    maskStorageId: v.optional(v.id("_storage")),
    requestedServiceType: v.optional(v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign"), v.literal("layout"), v.literal("replace"), v.literal("wall"), v.literal("transfer"), v.literal("reference"))),
    serviceType: v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign"), v.literal("layout"), v.literal("replace")),
    roomType: v.string(),
    style: v.string(),
    styleSelections: v.optional(v.array(v.string())),
    colorPalette: v.string(),
    modeId: v.optional(v.string()),
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
    qualityTier: v.optional(v.union(v.literal("free"), v.literal("standard_hd"), v.literal("premium"))),
    outputResolution: v.optional(v.string()),
    speedTier: v.optional(v.union(v.literal("standard"), v.literal("pro"), v.literal("ultra"))),
    planUsed: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; storageId: string; imageUrl: string | null }> => {
    const apiKey = trimOptional(process.env.AZURE_OPENAI_API_KEY);
    const endpoint = trimOptional(process.env.AZURE_OPENAI_ENDPOINT);
    const configuredDeploymentName = trimOptional(process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
    const deploymentName = configuredDeploymentName ?? AZURE_IMAGE_DEPLOYMENT_NAME;

    console.log("generateDesign: Azure SDK configuration", {
      apiKeyPresent: Boolean(apiKey),
      apiKeyPreview: redactSecret(apiKey),
      configuredDeploymentName: configuredDeploymentName ?? null,
      deploymentName,
      endpoint: endpoint ? ensureAzureEndpointPrefix(endpoint) : null,
      generationId: args.generationId,
      requestedServiceType: args.requestedServiceType ?? args.serviceType,
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
      const referenceBlobs = await Promise.all(
        (args.referenceImageStorageIds ?? []).map(async (storageId) => {
          const blob = await ctx.storage.get(storageId);
          if (!blob) {
            throw new ConvexError("One of the reference images could not be loaded from storage.");
          }
          return blob;
        }),
      );
      const maskBlob = args.maskStorageId ? await ctx.storage.get(args.maskStorageId) : null;
      if (args.maskStorageId && !maskBlob) {
        throw new ConvexError("The selected mask could not be loaded from storage.");
      }

      const renderProfile = resolveAzureRenderProfile({
        deploymentName,
        planUsed: trimOptional(args.planUsed),
        qualityTier:
          args.qualityTier === "premium"
            ? "premium"
            : args.qualityTier === "standard_hd"
              ? "standard_hd"
              : "free",
        outputResolution: trimOptional(args.outputResolution),
        aspectRatio: trimOptional(args.aspectRatio),
        speedTier: (args.speedTier as SpeedTier | undefined) ?? "standard",
      });

      const orchestratedDirection = await requestGeminiDesignOrchestration({
        sourceBlob,
        serviceType: args.serviceType as ServiceType,
        roomType: args.roomType,
        style: args.style,
        styleSelections: args.styleSelections,
        colorPalette: args.colorPalette,
      });
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
        serviceType: args.serviceType as ServiceType,
        roomType: args.roomType,
        style: resolvedStyle,
        styleSelections: resolvedStyleSelections,
        colorPalette: resolvedPalette,
        customPrompt: compactPromptSegments([
          buildModeSpecificInstruction({
            serviceType: args.serviceType as ServiceType,
            modeId: trimOptional(args.modeId),
          }),
          resolvedCustomPrompt,
        ]),
        targetColor: resolvedTargetColor,
        targetColorCategory: args.targetColorCategory,
        targetSurface: args.targetSurface,
        aspectRatio: args.aspectRatio,
        regenerate: args.regenerate,
        smartSuggest: args.smartSuggest,
      });
      const negativePrompt = buildDesignNegativePrompt({
        serviceType: args.serviceType as ServiceType,
        roomType: args.roomType,
      });

      await ctx.runMutation((internal as any).ai.saveOptimizedPrompt, {
        generationId: args.generationId,
        prompt: optimizedPrompt,
      });

      const generatedImage = await runAzureImageGeneration({
        apiKey,
        endpoint,
        prompt: optimizedPrompt,
        negativePrompt,
        serviceType: args.serviceType as ServiceType,
        roomType: args.roomType,
        sourceBlob,
        referenceBlobs,
        maskBlob,
        renderProfile,
        targetColor: args.targetColor,
        targetColorHex: args.targetColorHex,
        customPrompt: args.customPrompt,
        requestedServiceType: args.requestedServiceType,
      });

      const imageBytes = generatedImage.uint8Array;
      const imageBuffer = imageBytes.buffer.slice(
        imageBytes.byteOffset,
        imageBytes.byteOffset + imageBytes.byteLength,
      ) as ArrayBuffer;
      let outputBlob = new Blob([imageBuffer], {
        type: generatedImage.mediaType || "image/png",
      });

      if (renderProfile.watermarkRequired) {
        outputBlob = await limitFreeImageResolution(outputBlob);
        outputBlob = await applyHomeDecorWatermark(outputBlob);
      }

      console.log("generateDesign: Azure SDK generation completed", {
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
      const rawMessage = getAzureFailureMessage(error);
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
