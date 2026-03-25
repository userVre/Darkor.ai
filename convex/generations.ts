import {
  internalActionGeneric,
  internalMutationGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { deriveSubscriptionState, FREE_IMAGE_LIMIT } from "./subscriptions";

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const PRO_MIN_DELAY_MS = 4_000;

type GenerationStatus = "processing" | "ready" | "failed";
type SpeedTier = "standard" | "pro" | "ultra";

type GenerationUser = {
  _id: string;
  clerkId: string;
  credits: number;
  generationCount: number;
  reviewPrompted: boolean;
  lastReviewPromptAt?: number;
  lastRewardDate?: number;
  referralCode?: string;
  referralCount?: number;
  referredBy?: string;
  plan?: string;
  subscriptionType?: string;
  subscriptionEnd?: number;
  imageLimit?: number;
  imageGenerationCount?: number;
  lastResetDate?: number;
};

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

async function getUserByClerkId(ctx: any, clerkId: string) {
  return (await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", clerkId))
    .unique()) as GenerationUser | null;
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

async function syncDerivedSubscriptionState(ctx: any, user: GenerationUser, now: number) {
  const state = deriveSubscriptionState(user, now);
  const patch = omitUndefined(state.patch);
  if (Object.keys(patch).length > 0) {
    await ctx.db.patch(user._id as any, patch);
  }
  return state;
}

function getLimitExceededMessage(state: ReturnType<typeof deriveSubscriptionState>) {
  return state.statusMessage;
}

function computeReviewPrompt(nextCount: number, lastPromptAt: number, ignoreCooldown?: boolean) {
  const cooldownMs = 30 * 24 * 60 * 60 * 1000;
  const cooldownActive = lastPromptAt > 0 && Date.now() - lastPromptAt < cooldownMs;
  return ignoreCooldown ? nextCount >= 2 : !cooldownActive && (nextCount === 2 || nextCount === 3);
}

async function reserveGenerationAllowance(ctx: any, clerkId: string, ignoreCooldown?: boolean) {
  const user = await getUserByClerkId(ctx, clerkId);
  if (!user) {
    throw new ConvexError("No billing profile found. Please subscribe to continue.");
  }

  const state = await syncDerivedSubscriptionState(ctx, user, Date.now());
  if (state.blocked) {
    throw new ConvexError(getLimitExceededMessage(state));
  }

  const currentCount = typeof user.generationCount === "number" ? user.generationCount : 0;
  const nextGenerationCount = currentCount + 1;
  const lastPromptAt = typeof user.lastReviewPromptAt === "number" ? user.lastReviewPromptAt : 0;
  const shouldPrompt = computeReviewPrompt(nextGenerationCount, lastPromptAt, ignoreCooldown);
  const nextCredits = state.subscriptionType === "free" ? Math.max(state.credits - 1, 0) : state.credits;
  const nextImageGenerationCount = state.subscriptionType === "free" ? state.imageGenerationCount : state.imageGenerationCount + 1;

  await ctx.db.patch(user._id as any, {
    generationCount: nextGenerationCount,
    credits: nextCredits,
    imageLimit: state.limit,
    imageGenerationCount: nextImageGenerationCount,
    lastResetDate: state.subscriptionType === "free" ? 0 : state.lastResetDate,
    ...(typeof state.patch.imageLimit === "number" ? { imageLimit: state.patch.imageLimit } : {}),
    ...(typeof state.patch.lastResetDate === "number" ? { lastResetDate: state.patch.lastResetDate } : {}),
  });

  return {
    count: nextGenerationCount,
    shouldPrompt,
    creditsRemaining: state.subscriptionType === "free"
      ? nextCredits
      : Math.max(state.limit - nextImageGenerationCount, 0),
    planUsed: state.plan,
  };
}

async function releaseGenerationAllowance(ctx: any, clerkId: string) {
  const user = await getUserByClerkId(ctx, clerkId);
  if (!user) {
    return {
      ok: false,
      generationCount: 0,
      credits: 0,
    };
  }

  const state = await syncDerivedSubscriptionState(ctx, user, Date.now());
  const currentCount = typeof user.generationCount === "number" ? user.generationCount : 0;
  const nextGenerationCount = Math.max(currentCount - 1, 0);
  const nextCredits = state.subscriptionType === "free" ? Math.min(state.credits + 1, FREE_IMAGE_LIMIT) : state.credits;
  const nextImageGenerationCount = state.subscriptionType === "free" ? state.imageGenerationCount : Math.max(state.imageGenerationCount - 1, 0);

  await ctx.db.patch(user._id as any, {
    credits: nextCredits,
    imageLimit: state.limit,
    imageGenerationCount: nextImageGenerationCount,
    generationCount: nextGenerationCount,
  });

  return {
    ok: true,
    generationCount: nextGenerationCount,
    credits: state.subscriptionType === "free"
      ? nextCredits
      : Math.max(state.limit - nextImageGenerationCount, 0),
  };
}

function trimOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeAspectRatio(aspectRatio?: string | null) {
  const trimmed = aspectRatio?.trim();
  if (!trimmed) return "1:1";
  return /^\d+:\d+$/.test(trimmed) ? trimmed : "1:1";
}

function buildGenerationPrompt(args: {
  roomType: string;
  style: string;
  customPrompt?: string;
  aspectRatio: string;
  colorPalette: string;
  modeLabel: string;
  modePromptHint?: string;
  regenerate?: boolean;
}) {
  const customPrompt = trimOptional(args.customPrompt);
  const modeHint = trimOptional(args.modePromptHint);
  const variationInstruction = args.regenerate
    ? "Create a fresh alternate variation while preserving the same room type, camera framing, and overall architectural shell."
    : undefined;

  if (args.modeLabel === "Masked Paint Edit") {
    return [
      customPrompt ?? `Inpaint this image. Change the color of the masked area to ${args.colorPalette} on a ${args.roomType.toLowerCase()} texture. Maintain realism and lighting.`,
      modeHint ?? "Only repaint the masked region. Preserve all unmasked objects, geometry, furniture, shadows, and lighting exactly as they appear in the source image.",
      `Return a photorealistic edited image in a ${args.aspectRatio} frame.`,
      args.regenerate ? "Create a fresh alternate recolor while preserving the same masked region and composition." : undefined,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (args.modeLabel === "Masked Floor Edit") {
    return [
      customPrompt ?? `Inpaint this image. Replace the masked floor area with ${args.colorPalette}. Keep the room realistic and perspective-correct.`,
      modeHint ?? "Only edit the masked floor region. Preserve all unmasked walls, furniture, decor, shadows, reflections, and architecture exactly as shown.",
      "Respect the original floor perspective, plank or tile scale, and room lighting so the new flooring looks physically installed in the scene.",
      `Return a photorealistic edited image in a ${args.aspectRatio} frame.`,
      args.regenerate ? "Create a fresh alternate floor material mapping while preserving the same masked region and composition." : undefined,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `Transform this ${args.roomType} into a ${args.style} design.`,
    `Mode: ${args.modeLabel}.`,
    modeHint ?? "Preserve the original structure while elevating the space with a professionally designed redesign.",
    customPrompt ? `User instructions: ${customPrompt}.` : "User instructions: Keep the result elegant, premium, and practical.",
    `Use a ${args.colorPalette} palette direction and atmosphere.`,
    `Preserve the original floorplan, walls, doors, windows, ceiling height, architectural proportions, and camera angle from the source image.`,
    "Do not invent impossible geometry, do not warp the room, and do not remove key structural elements.",
    `Output a photorealistic 8k architectural visualization with realistic materials, natural lighting, premium staging, and editorial-quality detail in a ${args.aspectRatio} frame.`,
    variationInstruction,
  ].filter(Boolean).join(" ");
}

function decodeBase64ToBytes(base64: string) {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
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
    throw new ConvexError(`Gemini blocked the request (${blockReason}).`);
  }

  throw new ConvexError("Gemini did not return an image.");
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

function resolveRowStatus(row: { status?: string; imageUrl?: string | null }, imageUrl: string): GenerationStatus {
  if (row.status === "processing" || row.status === "ready" || row.status === "failed") {
    return row.status;
  }
  return imageUrl.length > 0 ? "ready" : "processing";
}

export const getUserArchive = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const rows = await ctx.db
      .query("generations")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    return await Promise.all(
      rows.map(async (row) => {
        const generatedStorageUrl = row.storageId ? await ctx.storage.getUrl(row.storageId) : null;
        const sourceImageUrl = row.sourceImageStorageId ? await ctx.storage.getUrl(row.sourceImageStorageId) : null;
        const imageUrl = generatedStorageUrl ?? row.imageUrl ?? "";
        return {
          ...row,
          imageUrl,
          sourceImageUrl,
          status: resolveRowStatus(row, imageUrl),
          isFavorite: row.isFavorite ?? false,
          errorMessage: row.errorMessage ?? null,
        };
      }),
    );
  },
});

export const createSourceUploadUrl = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const startGeneration = mutationGeneric({
  args: {
    sourceStorageId: v.id("_storage"),
    maskStorageId: v.optional(v.id("_storage")),
    roomType: v.string(),
    style: v.string(),
    customPrompt: v.optional(v.string()),
    aspectRatio: v.string(),
    colorPalette: v.string(),
    modeLabel: v.string(),
    modePromptHint: v.optional(v.string()),
    regenerate: v.optional(v.boolean()),
    ignoreReviewCooldown: v.optional(v.boolean()),
    speedTier: v.optional(v.union(v.literal("standard"), v.literal("pro"), v.literal("ultra"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const sourceMetadata = await ctx.db.system.get("_storage", args.sourceStorageId);
    if (!sourceMetadata) {
      throw new ConvexError("The selected source image is no longer available. Please upload it again.");
    }
    if (args.maskStorageId) {
      const maskMetadata = await ctx.db.system.get("_storage", args.maskStorageId);
      if (!maskMetadata) {
        throw new ConvexError("The selected mask is no longer available. Please paint the walls again.");
      }
    }

    const allowance = await reserveGenerationAllowance(ctx, identity.subject, args.ignoreReviewCooldown);
    const prompt = buildGenerationPrompt({
      roomType: args.roomType,
      style: args.style,
      customPrompt: args.customPrompt,
      aspectRatio: normalizeAspectRatio(args.aspectRatio),
      colorPalette: args.colorPalette,
      modeLabel: args.modeLabel,
      modePromptHint: args.modePromptHint,
      regenerate: args.regenerate,
    });

    const generationId = await ctx.db.insert("generations", {
      userId: identity.subject,
      sourceImageStorageId: args.sourceStorageId,
      maskImageStorageId: args.maskStorageId,
      storageId: undefined,
      imageUrl: undefined,
      prompt,
      style: args.style,
      roomType: args.roomType,
      customPrompt: trimOptional(args.customPrompt),
      colorPalette: args.colorPalette,
      aspectRatio: normalizeAspectRatio(args.aspectRatio),
      mode: args.modeLabel,
      speedTier: args.speedTier ?? "standard",
      status: "processing",
      errorMessage: undefined,
      planUsed: allowance.planUsed,
      createdAt: Date.now(),
      completedAt: undefined,
      isFavorite: false,
      feedback: undefined,
      feedbackReason: undefined,
      retryGranted: false,
      projectId: undefined,
    });

    await ctx.scheduler.runAfter(0, (internal as any).generations.runGenerationJob, {
      generationId,
      clerkId: identity.subject,
      sourceStorageId: args.sourceStorageId,
      maskStorageId: args.maskStorageId,
      prompt,
      aspectRatio: normalizeAspectRatio(args.aspectRatio),
      speedTier: args.speedTier ?? "standard",
    });

    return {
      generationId,
      prompt,
      reviewState: {
        count: allowance.count,
        shouldPrompt: allowance.shouldPrompt,
      },
      creditsRemaining: allowance.creditsRemaining,
      planUsed: allowance.planUsed,
    };
  },
});

export const markGenerationReady = internalMutationGeneric({
  args: {
    generationId: v.id("generations"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new ConvexError("Generation not found");
    }
    await ctx.db.patch(args.generationId, {
      storageId: args.storageId,
      imageUrl: undefined,
      status: "ready",
      errorMessage: undefined,
      completedAt: Date.now(),
    });

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    return { ok: true, imageUrl };
  },
});

export const markGenerationFailed = internalMutationGeneric({
  args: {
    generationId: v.id("generations"),
    clerkId: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (generation) {
      await ctx.db.patch(args.generationId, {
        status: "failed",
        errorMessage: args.errorMessage,
        completedAt: Date.now(),
      });
    }

    await releaseGenerationAllowance(ctx, args.clerkId);
    return { ok: true };
  },
});

export const runGenerationJob = internalActionGeneric({
  args: {
    generationId: v.id("generations"),
    clerkId: v.string(),
    sourceStorageId: v.id("_storage"),
    maskStorageId: v.optional(v.id("_storage")),
    prompt: v.string(),
    aspectRatio: v.string(),
    speedTier: v.optional(v.union(v.literal("standard"), v.literal("pro"), v.literal("ultra"))),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation((internal as any).generations.markGenerationFailed, {
        generationId: args.generationId,
        clerkId: args.clerkId,
        errorMessage: "Missing GEMINI_API_KEY in Convex environment variables.",
      });
      throw new ConvexError("Missing GEMINI_API_KEY in Convex environment variables.");
    }

    const startedAt = Date.now();
    let generatedStorageId: string | null = null;

    try {
      const sourceBlob = await ctx.storage.get(args.sourceStorageId);
      if (!sourceBlob) {
        throw new ConvexError("The source image could not be loaded from storage.");
      }
      const maskBlob = args.maskStorageId ? await ctx.storage.get(args.maskStorageId) : null;
      if (args.maskStorageId && !maskBlob) {
        throw new ConvexError("The painted wall mask could not be loaded from storage.");
      }

      const sourceBase64 = await blobToBase64(sourceBlob);
      const maskBase64 = maskBlob ? await blobToBase64(maskBlob) : null;
      const parts: GeminiInlinePart[] = [
        { text: args.prompt },
        {
          inlineData: {
            mimeType: sourceBlob.type || "image/jpeg",
            data: sourceBase64,
          },
        },
      ];

      if (maskBlob && maskBase64) {
        parts.push({
          text: "The second image is a wall-selection mask. White shows where paint should be applied. Black must remain untouched.",
        });
        parts.push({
          inlineData: {
            mimeType: maskBlob.type || "image/png",
            data: maskBase64,
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
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              aspectRatio: normalizeAspectRatio(args.aspectRatio),
            },
          },
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseGeminiError(response);
        throw new ConvexError(errorMessage || `Gemini request failed with status ${response.status}.`);
      }

      const gemini = (await response.json()) as GeminiResponse;
      const generated = extractGeneratedImage(gemini);
      const bytes = decodeBase64ToBytes(generated.data);
      const imageBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([imageBuffer], { type: generated.mimeType ?? "image/png" });

      await waitForMinimumDuration(startedAt, (args.speedTier as SpeedTier | undefined) ?? "standard");
      generatedStorageId = (await ctx.storage.store(blob)) as string;

      await ctx.runMutation((internal as any).generations.markGenerationReady, {
        generationId: args.generationId,
        storageId: generatedStorageId,
      });

      return { ok: true, storageId: generatedStorageId };
    } catch (error) {
      if (generatedStorageId) {
        await ctx.storage.delete(generatedStorageId as any);
      }

      const message = error instanceof Error ? error.message : "Generation failed";
      await ctx.runMutation((internal as any).generations.markGenerationFailed, {
        generationId: args.generationId,
        clerkId: args.clerkId,
        errorMessage: message,
      });
      throw error;
    }
  },
});

export const submitFeedback = mutationGeneric({
  args: {
    id: v.id("generations"),
    sentiment: v.union(v.literal("liked"), v.literal("disliked")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Generation not found");
    }
    if (item.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.id, {
      feedback: args.sentiment,
      feedbackReason: args.reason?.trim() || item.feedbackReason,
      retryGranted: item.retryGranted ?? false,
    });

    return { ok: true, retryGranted: false };
  },
});

export const toggleFavorite = mutationGeneric({
  args: {
    id: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Generation not found");
    }
    if (item.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const nextValue = !(item.isFavorite ?? false);
    await ctx.db.patch(args.id, { isFavorite: nextValue });
    return { ok: true, isFavorite: nextValue };
  },
});

export const setProject = mutationGeneric({
  args: {
    id: v.id("generations"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Generation not found");
    }
    if (item.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== identity.subject) {
        throw new Error("Invalid project");
      }
    }

    await ctx.db.patch(args.id, { projectId: args.projectId ?? undefined });
    return { ok: true };
  },
});

export const deleteGeneration = mutationGeneric({
  args: {
    id: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Generation not found");
    }
    if (item.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    if (item.storageId) {
      await ctx.storage.delete(item.storageId);
    }
    if (item.maskImageStorageId) {
      await ctx.storage.delete(item.maskImageStorageId);
    }
    if (item.sourceImageStorageId) {
      await ctx.storage.delete(item.sourceImageStorageId);
    }

    await ctx.db.delete(args.id);
    return { ok: true };
  },
});
