"use node";

import { experimental_generateImage, APICallError } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { buildAzureOpenAIBaseUrl, ensureAzureEndpointPrefix } from "./azureOpenAI";
import {
  compactPromptSegments,
  dedupeSuggestions,
  IMAGE_PROCESSING_REJECTION_MESSAGE,
  normalizeGenerationError,
  requestAzureDesignOrchestration,
  trimOptional,
} from "./ai";
import {
  buildDesignNegativePrompt,
  buildDesignPrompt,
  GLOBAL_MASTERPIECE_QUALITY_INSTRUCTION,
  GLOBAL_PERSPECTIVE_LOCK_INSTRUCTION,
  GLOBAL_REALISM_TOKEN_INJECTION,
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
type IncomingServiceType = ServiceType | "interior" | "exterior" | "garden";
type RequestedServiceType = IncomingServiceType | "wall" | "transfer" | "reference";
type RedesignSurfaceType = "interior" | "exterior" | "garden";
type SpeedTier = "standard" | "pro" | "ultra";
type AzureRenderSize = "1024x1024" | "1024x1536" | "1536x1024";
type AzureRenderQuality = "medium" | "high";
type GenerationQualityTier = "free" | "standard_hd" | "premium";

type AzureRenderProfile = {
  deploymentName: string;
  size: AzureRenderSize;
  quality: AzureRenderQuality;
  watermarkRequired: boolean;
};

const FREE_MAX_IMAGE_DIMENSION = 1080;
const SAFE_INPUT_MAX_IMAGE_DIMENSION = 1536;
const WATERMARK_TEXT = "HomeDecor AI";

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function canonicalizeServiceType(serviceType: RequestedServiceType | IncomingServiceType): ServiceType {
  if (serviceType === "wall") {
    return "paint";
  }

  if (
    serviceType === "interior" ||
    serviceType === "exterior" ||
    serviceType === "garden" ||
    serviceType === "transfer" ||
    serviceType === "reference"
  ) {
    return "redesign";
  }

  return serviceType;
}

function getRequestedRedesignSurface(serviceType?: RequestedServiceType | IncomingServiceType | null): RedesignSurfaceType | null {
  return serviceType === "interior" || serviceType === "exterior" || serviceType === "garden"
    ? serviceType
    : null;
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

function getPromptRoomType(args: {
  requestedServiceType?: RequestedServiceType | IncomingServiceType | null;
  roomType: string;
}) {
  const roomType = trimOptional(args.roomType) ?? "space";
  const surface = getRequestedRedesignSurface(args.requestedServiceType);

  if (surface === "interior") {
    return `Interior ${roomType}`;
  }
  if (surface === "exterior") {
    return `Exterior ${roomType}`;
  }
  if (surface === "garden") {
    return `Garden ${roomType}`;
  }

  return roomType;
}

function buildAzurePrompt(args: {
  prompt: string;
  negativePrompt: string;
  serviceType: ServiceType;
  requestedServiceType?: RequestedServiceType;
  roomType: string;
  flowInstruction?: string;
}) {
  const requestedSurface = getRequestedRedesignSurface(args.requestedServiceType);
  const exteriorPerspectiveLock = requestedSurface === "exterior" || requestedSurface === "garden" || isExteriorRedesignContext({
    serviceType: args.serviceType,
    roomType: args.roomType,
  })
    ? `\n\n${AZURE_EXTERIOR_PERSPECTIVE_LOCK_PROMPT}`
    : "";

  return `${AZURE_GEOMETRIC_ADHERENCE_SYSTEM_PROMPT}${exteriorPerspectiveLock}\n\n${args.flowInstruction ? `${args.flowInstruction}\n\n` : ""}${args.prompt}\n\nRealism Tokens: ${GLOBAL_REALISM_TOKEN_INJECTION}\n\nAvoid: ${args.negativePrompt}`;
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

  if (args.requestedServiceType === "interior") {
    return "Interior redesign flow: treat the uploaded image as an indoor room. Preserve walls, windows, doors, ceiling height, camera angle, and natural light direction while redesigning furniture, materials, palette, decor, and styling.";
  }

  if (args.requestedServiceType === "exterior") {
    return "Exterior redesign flow: treat the uploaded image as a building facade or property exterior. Redesign the facade, entry, driveway, immediate landscaping, exterior lighting, and curb appeal as one polished architectural scene while preserving building massing, rooflines, openings, horizon, and site placement.";
  }

  if (args.requestedServiceType === "garden") {
    return "Garden redesign flow: treat the uploaded image as an outdoor landscape. Redesign planting, hardscape, patio or pool zones, garden lighting, outdoor furniture, and circulation as one resort-level landscape while preserving boundaries, facade positions, grade changes, steps, doors, windows, and camera perspective.";
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
  quality?: AzureRenderQuality;
  qualityTier?: GenerationQualityTier;
  outputResolution?: string;
  aspectRatio?: string;
}) {
  if (args.quality === "high") {
    return "1024x1536";
  }
  if (args.quality === "medium") {
    return "1024x1024";
  }

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
  renderQuality?: AzureRenderQuality;
  applyWatermark?: boolean;
  outputResolution?: string;
  aspectRatio?: string;
}) {
  const quality: AzureRenderQuality = args.renderQuality === "high" && args.qualityTier === "premium"
    ? "high"
    : "medium";
  const size = resolveAzureImageSize({
    quality,
    qualityTier: args.qualityTier,
    outputResolution: args.outputResolution,
    aspectRatio: args.aspectRatio,
  });

  return {
    deploymentName: args.deploymentName,
    size,
    quality,
    watermarkRequired: args.applyWatermark ?? quality !== "high",
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

function isOpenAIImagePolicyRejection(message?: string | null) {
  const normalized = trimOptional(message)?.toLowerCase() ?? "";
  return (
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
  );
}

function getAzureImageMimeType(blob: Blob) {
  const mimeType = trimOptional(blob.type)?.toLowerCase();
  if (mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  }
  return "image/jpeg";
}

function isAzureEditSupportedMimeType(mimeType?: string | null) {
  const normalized = trimOptional(mimeType)?.toLowerCase();
  return normalized === "image/png" || normalized === "image/jpeg" || normalized === "image/jpg";
}

function inferImageMimeTypeFromBytes(bytes?: Uint8Array | Buffer | null) {
  if (!bytes || bytes.byteLength < 4) {
    return null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function loadSharp() {
  const importRuntimeModule = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<any>;
  const sharpModule = await importRuntimeModule("sharp");
  return sharpModule.default ?? sharpModule;
}

function getAzureImageFilename(blob: Blob, index: number, prefix: string) {
  const mimeType = getAzureImageMimeType(blob);
  const extension = mimeType === "image/png" ? "png" : "jpg";
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
    baseURL: buildAzureOpenAIBaseUrl(args.endpoint),
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
          isAbortError(error)
            ? "Azure API Timeout"
            : error instanceof Error
              ? error.message
              : "Azure image generation request failed.";

        console.error("generateDesign: Azure image request threw", {
          endpoint: requestUrl,
          message,
        });
        throw isAbortError(error) ? new Error(message) : error;
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}

async function optimizeJpegWithSharp(imageBuffer: Buffer, args: { maxDimension: number; quality: number }) {
  const sharp = await loadSharp();
  return await sharp(imageBuffer, { failOn: "none" })
    .rotate()
    .resize({
      width: args.maxDimension,
      height: args.maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: args.quality, mozjpeg: true })
    .toBuffer();
}

async function optimizeJpegWithJimp(imageBuffer: Buffer, args: { maxDimension: number; quality: number }) {
  const jimpModule = (await import("jimp-compact")) as any;
  const Jimp = jimpModule.default ?? jimpModule;
  const image = await Jimp.read(imageBuffer);
  image.scaleToFit(args.maxDimension, args.maxDimension);
  image.quality(args.quality);
  return Buffer.from(await image.getBufferAsync(Jimp.MIME_JPEG ?? "image/jpeg"));
}

async function applyHomeDecorWatermarkWithJimp(imageBuffer: Buffer) {
  const jimpModule = (await import("jimp-compact")) as any;
  const Jimp = jimpModule.default ?? jimpModule;
  const image = await Jimp.read(imageBuffer);
  const width = Math.max(Math.round(image.bitmap?.width ?? FREE_MAX_IMAGE_DIMENSION), 1);
  const height = Math.max(Math.round(image.bitmap?.height ?? FREE_MAX_IMAGE_DIMENSION), 1);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
  const paddingX = 12;
  const paddingY = 8;
  const textWidth = Math.max(Jimp.measureText(font, WATERMARK_TEXT), 1);
  const textHeight = Math.max(Jimp.measureTextHeight(font, WATERMARK_TEXT, textWidth), 16);
  const badgeWidth = textWidth + paddingX * 2;
  const badgeHeight = textHeight + paddingY * 2;
  const margin = 16;
  const x = Math.max(margin, width - badgeWidth - margin);
  const y = Math.max(margin, height - badgeHeight - margin);
  const badge = await Jimp.create(badgeWidth, badgeHeight, Jimp.rgbaToInt(5, 7, 10, 184));

  image.composite(badge, x, y);
  image.print(font, x + paddingX, y + paddingY, WATERMARK_TEXT);
  image.quality(90);

  return Buffer.from(await image.getBufferAsync(Jimp.MIME_JPEG ?? "image/jpeg"));
}

async function optimizeJpegImage(imageBuffer: Buffer, args: { maxDimension: number; quality: number; caller: string }) {
  try {
    return await optimizeJpegWithSharp(imageBuffer, args);
  } catch (sharpError) {
    console.warn(`${args.caller}: sharp JPEG optimization failed, trying Jimp fallback`, {
      message: sharpError instanceof Error ? sharpError.message : "Unknown sharp error",
    });
  }

  return await optimizeJpegWithJimp(imageBuffer, args);
}

async function prepareSafeOpenAIInputImage(blob: Blob, caller: string) {
  let imageBuffer: Buffer | null = null;
  try {
    imageBuffer = await blobToImageBuffer(blob, caller);
    if (!imageBuffer) {
      throw new ConvexError("Unable to read source image bytes.");
    }

    const optimized = await optimizeJpegImage(imageBuffer, {
      maxDimension: SAFE_INPUT_MAX_IMAGE_DIMENSION,
      quality: 88,
      caller,
    });

    return new Blob([optimized], { type: "image/jpeg" });
  } catch (error) {
    console.warn(`${caller}: failed to optimize OpenAI input image`, {
      message: error instanceof Error ? error.message : "Unknown image preparation error",
    });
    const inferredMimeType = inferImageMimeTypeFromBytes(imageBuffer);
    if (inferredMimeType && imageBuffer && isAzureEditSupportedMimeType(inferredMimeType)) {
      return new Blob([imageBuffer], { type: inferredMimeType });
    }

    throw new ConvexError("The selected image could not be converted to a JPG or PNG for generation.");
  }
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
    requestedServiceType: args.requestedServiceType,
    roomType: args.roomType,
    flowInstruction,
  });
  const sourceImages = [args.sourceBlob, ...args.referenceBlobs];
  const usesImageEditFlow = sourceImages.length > 0;

  if (usesImageEditFlow) {
    const requestUrl = `${ensureAzureEndpointPrefix(args.endpoint)}openai/deployments/${args.renderProfile.deploymentName}/images/edits?api-version=${AZURE_IMAGE_API_VERSION}`;
    const formData = new FormData();
    formData.append("model", args.renderProfile.deploymentName);
    formData.append("prompt", composedPrompt);
    formData.append("size", args.renderProfile.size);
    formData.append("quality", args.renderProfile.quality);
    formData.append("n", "1");

    const safeSourceImages = await Promise.all(
      sourceImages.map((blob, index) => prepareSafeOpenAIInputImage(blob, `prepareOpenAIInputImage:${index}`)),
    );

    let imageFieldCount = 0;
    safeSourceImages.forEach((blob, index) => {
      const normalizedBlob = normalizeAzureImageBlob(blob);
      const filename = getAzureImageFilename(normalizedBlob, index, "image");
      formData.append("image[]", createAzureMultipartFile(normalizedBlob, filename), filename);
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AZURE_IMAGE_REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "api-key": args.apiKey,
        },
        body: formData,
        signal: controller.signal,
      });
    } catch (error) {
      throw isAbortError(error) ? new ConvexError("Azure API Timeout") : error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const reason = await parseAzureError(response);
      throw new ConvexError(
        isOpenAIImagePolicyRejection(reason)
          ? IMAGE_PROCESSING_REJECTION_MESSAGE
          : reason,
      );
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
    providerOptions: {
      openai: {
        quality: args.renderProfile.quality,
      },
    },
    n: 1,
    maxRetries: 2,
  });

  if (result.images.length === 0) {
    throw new ConvexError("Azure OpenAI returned no image.");
  }

  return result.image;
}

async function limitFreeImageResolution(blob: Blob) {
  try {
    const imageBuffer = await blobToImageBuffer(blob, "limitFreeImageResolution");
    if (!imageBuffer) {
      console.warn("limitFreeImageResolution: generated image bytes were empty; storing original image");
      return blob;
    }

    const resized = await optimizeJpegImage(imageBuffer, {
      maxDimension: FREE_MAX_IMAGE_DIMENSION,
      quality: 92,
      caller: "limitFreeImageResolution",
    });

    return new Blob([resized], { type: "image/jpeg" });
  } catch (error) {
    console.error("limitFreeImageResolution: failed", {
      message: error instanceof Error ? error.message : "Unknown resize error",
    });
    return blob;
  }
}

async function applyHomeDecorWatermark(blob: Blob) {
  try {
    const imageBuffer = await blobToImageBuffer(blob, "applyHomeDecorWatermark");
    if (!imageBuffer) {
      throw new ConvexError("Unable to read generated image bytes for watermarking.");
    }

    let watermarked: Buffer;
    try {
      const sharp = await loadSharp();
      const metadata = await sharp(imageBuffer, { failOn: "none" }).metadata();
      const width = Math.max(Math.round(metadata.width ?? FREE_MAX_IMAGE_DIMENSION), 1);
      const height = Math.max(Math.round(metadata.height ?? FREE_MAX_IMAGE_DIMENSION), 1);
      const watermarkSvg = buildCornerWatermarkBadgeSvg(width, height);
      watermarked = await sharp(imageBuffer, { failOn: "none" })
        .composite([{ input: Buffer.from(watermarkSvg), blend: "over" }])
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
    } catch (sharpError) {
      console.warn("applyHomeDecorWatermark: sharp watermark failed, trying Jimp fallback", {
        message: sharpError instanceof Error ? sharpError.message : "Unknown sharp error",
      });
      watermarked = await applyHomeDecorWatermarkWithJimp(imageBuffer);
    }

    return new Blob([watermarked], { type: "image/jpeg" });
  } catch (error) {
    console.error("applyHomeDecorWatermark: failed", {
      message: error instanceof Error ? error.message : "Unknown watermark error",
    });
    return blob;
  }
}

function buildCornerWatermarkBadgeSvg(width: number, height: number) {
  const shortSide = Math.min(width, height);
  const fontSize = Math.max(14, Math.min(22, Math.round(shortSide * 0.018)));
  const paddingX = Math.round(fontSize * 0.8);
  const paddingY = Math.round(fontSize * 0.48);
  const badgeWidth = Math.round(WATERMARK_TEXT.length * fontSize * 0.62 + paddingX * 2);
  const badgeHeight = fontSize + paddingY * 2;
  const margin = Math.max(14, Math.round(shortSide * 0.024));
  const radius = Math.max(6, Math.round(fontSize * 0.45));
  const x = Math.max(margin, width - badgeWidth - margin);
  const y = Math.max(margin, height - badgeHeight - margin);
  const textX = x + paddingX;
  const textY = y + badgeHeight / 2;

  return [
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect x="${x}" y="${y}" width="${badgeWidth}" height="${badgeHeight}" rx="${radius}" fill="#05070A" opacity="0.72"/>`,
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="${badgeWidth - 1}" height="${badgeHeight - 1}" rx="${radius}" fill="none" stroke="#FFFFFF" stroke-opacity="0.18"/>`,
    `<text x="${textX}" y="${textY}" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600" dominant-baseline="middle">${WATERMARK_TEXT}</text>`,
    "</svg>",
  ].join("");
}

async function blobToImageBuffer(blob: Blob, caller: string) {
  const arrayBuffer = await blob.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);
  if (rawBytes.byteLength === 0) {
    console.warn(`${caller}: empty image data`);
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
    console.warn(`${caller}: missing base64 image data`);
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

async function getOnboardingDemoFallback(
  ctx: any,
  imageStorageId: string,
): Promise<{ ok: true; storageId: string; imageUrl: string | null }> {
  const imageUrl = await ctx.storage.getUrl(imageStorageId as any);
  return {
    ok: true,
    storageId: imageStorageId,
    imageUrl,
  };
}

export const renderOnboardingDemo: any = action({
  args: {
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<{ ok: true; storageId: string; imageUrl: string | null }> => {
    const apiKey = trimOptional(process.env.AZURE_OPENAI_API_KEY);
    const endpoint = trimOptional(process.env.AZURE_OPENAI_ENDPOINT);
    const configuredDeploymentName = trimOptional(process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
    const deploymentName = configuredDeploymentName ?? AZURE_IMAGE_DEPLOYMENT_NAME;

    try {
      const sourceBlob = await ctx.storage.get(args.imageStorageId);
      if (!sourceBlob) {
        throw new ConvexError("The demo source image could not be loaded from storage.");
      }

      if (!apiKey || !endpoint || !deploymentName) {
        return await getOnboardingDemoFallback(ctx, args.imageStorageId);
      }

      const roomType = "living room";
      const style = "Warm modern luxury";
      const prompt = buildPrompt({
        serviceType: "redesign",
        roomType,
        style,
        styleSelections: [style],
        colorPalette: "warm neutrals, walnut, travertine, soft linen, matte black accents",
        customPrompt:
          "Transform this sample empty room into a polished, photorealistic interior design concept with premium furniture, layered lighting, natural materials, and a finished magazine-quality composition. Preserve the exact camera angle, walls, windows, floor plane, and room geometry.",
        aspectRatio: "1:1",
      });
      const negativePrompt = buildDesignNegativePrompt({
        serviceType: "redesign",
        roomType,
      });
      const renderProfile: AzureRenderProfile = {
        deploymentName,
        size: "1024x1024",
        quality: "medium",
        watermarkRequired: false,
      };

      await ctx.runMutation((internal as any).generations.logRender, {
        userId: "onboarding_demo",
        quality: "medium",
        costUsd: 0.042,
        userTier: "free",
      });

      const generatedImage = await runAzureImageGeneration({
        apiKey,
        endpoint,
        prompt,
        negativePrompt,
        serviceType: "redesign",
        roomType,
        sourceBlob,
        referenceBlobs: [],
        maskBlob: null,
        renderProfile,
        customPrompt: "Warm modern luxury onboarding demo render.",
        requestedServiceType: "redesign",
      });

      const imageBytes = generatedImage.uint8Array;
      const imageBuffer = imageBytes.buffer.slice(
        imageBytes.byteOffset,
        imageBytes.byteOffset + imageBytes.byteLength,
      ) as ArrayBuffer;
      const outputBlob = new Blob([imageBuffer], {
        type: generatedImage.mediaType || "image/png",
      });
      const storageId = (await ctx.storage.store(outputBlob)) as string;
      const imageUrl = await ctx.storage.getUrl(storageId as any);

      return {
        ok: true,
        storageId,
        imageUrl,
      };
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      return await getOnboardingDemoFallback(ctx, args.imageStorageId);
    }
  },
});

export const generateDesign: any = internalAction({
  args: {
    generationId: v.id("generations"),
    ownerId: v.string(),
    imageStorageId: v.id("_storage"),
    referenceImageStorageIds: v.optional(v.array(v.id("_storage"))),
    maskStorageId: v.optional(v.id("_storage")),
    requestedServiceType: v.optional(v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign"), v.literal("layout"), v.literal("replace"), v.literal("interior"), v.literal("exterior"), v.literal("garden"), v.literal("wall"), v.literal("transfer"), v.literal("reference"))),
    serviceType: v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign"), v.literal("layout"), v.literal("replace"), v.literal("interior"), v.literal("exterior"), v.literal("garden")),
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
    renderQuality: v.optional(v.union(v.literal("medium"), v.literal("high"))),
    applyWatermark: v.optional(v.boolean()),
    estimatedCostUsd: v.optional(v.number()),
    renderUserTier: v.optional(v.union(v.literal("free"), v.literal("paid"))),
    outputResolution: v.optional(v.string()),
    speedTier: v.optional(v.union(v.literal("standard"), v.literal("pro"), v.literal("ultra"))),
    planUsed: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; storageId: string; imageUrl: string; isWatermarked: boolean; quality: AzureRenderQuality }> => {
    const apiKey = trimOptional(process.env.AZURE_OPENAI_API_KEY);
    const endpoint = trimOptional(process.env.AZURE_OPENAI_ENDPOINT);
    const configuredDeploymentName = trimOptional(process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
    const deploymentName = configuredDeploymentName ?? AZURE_IMAGE_DEPLOYMENT_NAME;

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
      const serviceType = canonicalizeServiceType(args.serviceType as IncomingServiceType);
      const requestedServiceType = args.requestedServiceType
        ? args.requestedServiceType as RequestedServiceType
        : undefined;
      const promptRoomType = getPromptRoomType({
        requestedServiceType,
        roomType: args.roomType,
      });
      const originalSourceBlob = await ctx.storage.get(args.imageStorageId);
      if (!originalSourceBlob) {
        throw new ConvexError("The source image could not be loaded from storage.");
      }
      const sourceBlob = await prepareSafeOpenAIInputImage(originalSourceBlob, "generateDesign:sourceImage");
      const referenceBlobs = await Promise.all(
        (args.referenceImageStorageIds ?? []).map(async (storageId) => {
          const blob = await ctx.storage.get(storageId);
          if (!blob) {
            throw new ConvexError("One of the reference images could not be loaded from storage.");
          }
          return await prepareSafeOpenAIInputImage(blob, `generateDesign:referenceImage:${storageId}`);
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
        renderQuality: args.renderQuality === "high" ? "high" : "medium",
        applyWatermark: args.applyWatermark,
        outputResolution: trimOptional(args.outputResolution),
        aspectRatio: trimOptional(args.aspectRatio),
        speedTier: (args.speedTier as SpeedTier | undefined) ?? "standard",
      });

      const orchestratedDirection = await requestAzureDesignOrchestration({
        sourceBlob,
        serviceType,
        roomType: promptRoomType,
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
        serviceType === "paint" && orchestratedDirection?.wallColor
          ? `Primary wall color recommendation: ${orchestratedDirection.wallColor}.`
          : undefined,
        serviceType === "floor" && orchestratedDirection?.floorMaterial
          ? `Primary flooring recommendation: ${orchestratedDirection.floorMaterial}.`
          : undefined,
        serviceType === "redesign" && orchestratedDirection?.fusionPrompt
          ? `Fusion design brief: ${orchestratedDirection.fusionPrompt}.`
          : undefined,
        serviceType === "redesign" && orchestrationReason
          ? `Design direction rationale: ${orchestrationReason}.`
          : undefined,
        orchestrationPrompt,
      ]);

      const resolvedStyleSelections =
        serviceType === "redesign"
          ? dedupeSuggestions(
              [resolvedStyle, ...(orchestratedDirection?.styles ?? args.styleSelections ?? [])],
              resolvedStyle,
            )
          : args.styleSelections;

      const optimizedPrompt = buildPrompt({
        serviceType,
        roomType: promptRoomType,
        style: resolvedStyle,
        styleSelections: resolvedStyleSelections,
        colorPalette: resolvedPalette,
        customPrompt: compactPromptSegments([
          buildModeSpecificInstruction({
            serviceType,
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
        serviceType,
        roomType: promptRoomType,
      });

      await ctx.runMutation((internal as any).ai.saveOptimizedPrompt, {
        generationId: args.generationId,
        prompt: optimizedPrompt,
      });

      await ctx.runMutation((internal as any).generations.logRender, {
        userId: args.ownerId,
        quality: renderProfile.quality,
        costUsd: args.estimatedCostUsd ?? (renderProfile.quality === "high" ? 0.25 : 0.042),
        userTier: args.renderUserTier ?? (renderProfile.quality === "high" ? "paid" : "free"),
      });

      const generatedImage = await runAzureImageGeneration({
        apiKey,
        endpoint,
        prompt: optimizedPrompt,
        negativePrompt,
        serviceType,
        roomType: promptRoomType,
        sourceBlob,
        referenceBlobs,
        maskBlob,
        renderProfile,
        targetColor: args.targetColor,
        targetColorHex: args.targetColorHex,
        customPrompt: args.customPrompt,
        requestedServiceType,
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

      generatedStorageId = (await ctx.storage.store(outputBlob)) as string;

      const saveResult = (await ctx.runMutation((internal as any).ai.saveGeneration, {
        generationId: args.generationId,
        storageId: generatedStorageId,
      })) as { imageUrl: string };

      return {
        ok: true,
        storageId: generatedStorageId,
        imageUrl: saveResult.imageUrl,
        isWatermarked: renderProfile.watermarkRequired,
        quality: renderProfile.quality,
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
        errorMessage: friendlyMessage,
      });

      throw new ConvexError(friendlyMessage);
    }
  },
});
