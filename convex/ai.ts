import { internalActionGeneric, internalMutationGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type ServiceType = "paint" | "floor" | "redesign";

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

function trimOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeAspectRatio(aspectRatio?: string | null) {
  const trimmed = aspectRatio?.trim();
  if (!trimmed) return "1:1";
  return /^\d+:\d+$/.test(trimmed) ? trimmed : "1:1";
}

function buildDesignPrompt(args: {
  serviceType: ServiceType;
  selection: string;
  roomType?: string;
  customPrompt?: string;
  hasMask: boolean;
}) {
  const roomType = trimOptional(args.roomType) ?? "room";
  const selection = trimOptional(args.selection) ?? "premium redesign";
  const customPrompt = trimOptional(args.customPrompt);

  if (args.serviceType === "paint") {
    return [
      `Keep the ${roomType.toLowerCase()} structure exactly the same, but repaint the masked area (walls) with the color ${selection}. High-end architectural finish.`,
      "The second image is a binary wall-selection mask. White is the only editable region. Black must remain untouched.",
      "Preserve the furniture, floors, trim, windows, doors, ceiling, lighting, shadows, reflections, and perspective exactly as they appear.",
      customPrompt ? `Additional user direction: ${customPrompt}.` : undefined,
      "Return a photorealistic interior edit with believable paint texture, material response, and premium staging quality.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (args.serviceType === "floor") {
    return [
      `Keep the furniture and walls exactly the same, but replace the masked floor area with ${selection} material. Ensure correct perspective and realistic reflections.`,
      "The second image is a binary floor-selection mask. White is the only editable floor region. Black must remain untouched.",
      "Preserve the walls, furniture, decor, doors, windows, baseboards, shadows, and camera framing exactly as they appear.",
      customPrompt ? `Additional user direction: ${customPrompt}.` : undefined,
      "Return a photorealistic architectural edit with realistic texture scale, grounding, and lighting continuity.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `Complete ${roomType.toLowerCase()} transformation in ${selection} style. Maintain the original architectural layout but furniture and decor should be entirely redesigned.`,
    "Preserve the original floorplan, wall positions, doors, windows, ceiling height, and camera framing exactly.",
    customPrompt ? `Additional user direction: ${customPrompt}.` : "Keep the result premium, photorealistic, and publication-ready.",
    "Output an 8K-quality architectural visualization with refined materials, cohesive lighting, and editorial-level realism.",
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

function normalizeGenerationError(message?: string | null) {
  const raw = trimOptional(message) ?? "Generation failed.";
  const normalized = raw.toLowerCase();

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

export const generateDesign = internalActionGeneric({
  args: {
    generationId: v.id("generations"),
    ownerId: v.string(),
    imageStorageId: v.id("_storage"),
    maskStorageId: v.optional(v.id("_storage")),
    serviceType: v.union(v.literal("paint"), v.literal("floor"), v.literal("redesign")),
    selection: v.string(),
    customPrompt: v.optional(v.string()),
    roomType: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

      const parts: GeminiInlinePart[] = [
        {
          text: buildDesignPrompt({
            serviceType: args.serviceType,
            selection: args.selection,
            roomType: args.roomType,
            customPrompt: args.customPrompt,
            hasMask: Boolean(maskBlob),
          }),
        },
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
              ? "Reference mask for wall repainting. White marks the only editable wall region."
              : "Reference mask for floor restyling. White marks the only editable floor region.",
        });
        parts.push({
          inlineData: {
            mimeType: maskBlob.type || "image/png",
            data: await blobToBase64(maskBlob),
          },
        });
      }

      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ["Image"],
            imageConfig: {
              aspectRatio: normalizeAspectRatio(args.aspectRatio),
              imageSize: "4K",
            },
          },
        }),
      });

      if (!response.ok) {
        throw new ConvexError(normalizeGenerationError(await parseGeminiError(response)));
      }

      const payload = (await response.json()) as GeminiResponse;
      const generated = extractGeneratedImage(payload);
      const bytes = decodeBase64ToBytes(generated.data);
      const imageBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const outputBlob = new Blob([imageBuffer], { type: generated.mimeType ?? "image/png" });

      generatedStorageId = (await ctx.storage.store(outputBlob)) as string;
      const saveResult = await ctx.runMutation((internal as any).ai.saveGeneration, {
        generationId: args.generationId,
        storageId: generatedStorageId,
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
      await ctx.runMutation((internal as any).generations.markGenerationFailed, {
        generationId: args.generationId,
        ownerId: args.ownerId,
        errorMessage: message,
      });
      throw new ConvexError(message);
    }
  },
});
