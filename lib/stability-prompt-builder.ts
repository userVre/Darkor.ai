type ServiceType = "paint" | "floor" | "redesign";

function trimOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function compact(parts: Array<string | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(" ");
}

export function normalizeAspectRatio(aspectRatio?: string | null) {
  const trimmed = aspectRatio?.trim();
  if (!trimmed) return "1:1";
  return /^\d+:\d+$/.test(trimmed) ? trimmed : "1:1";
}

export function buildStabilityPrompt(args: {
  serviceType: ServiceType;
  roomType: string;
  style: string;
  colorPalette: string;
  customPrompt?: string;
  targetColor?: string;
  targetSurface?: string;
  aspectRatio?: string;
  regenerate?: boolean;
}) {
  const roomType = trimOptional(args.roomType) ?? "space";
  const style = trimOptional(args.style) ?? "luxury contemporary";
  const palette = trimOptional(args.colorPalette) ?? style;
  const targetColor = trimOptional(args.targetColor);
  const targetSurface = trimOptional(args.targetSurface);
  const customPrompt = trimOptional(args.customPrompt);
  const aspectRatio = normalizeAspectRatio(args.aspectRatio);
  const variationInstruction = args.regenerate
    ? "Create a fresh alternate variation while preserving the same architecture, framing, and realism."
    : undefined;

  if (args.serviceType === "paint") {
    return compact([
      `A photorealistic, highly detailed ${style} ${roomType.toLowerCase()} with ${targetColor ?? palette} wall finishes.`,
      targetSurface ? `Only repaint the masked ${targetSurface.toLowerCase()} area.` : "Only repaint the masked wall area.",
      "Preserve the original structure, furniture, lighting, shadows, trim, windows, decor, and camera perspective perfectly.",
      "Architectural photography style, believable paint texture, clean masking edges, cinematic lighting, premium interior render.",
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  if (args.serviceType === "floor") {
    return compact([
      `A photorealistic, highly detailed ${style} ${roomType.toLowerCase()} with ${targetColor ?? palette} flooring tones.`,
      "Only replace the masked floor area and preserve every non-masked region exactly as photographed.",
      "Keep realistic floor perspective, seams, reflections, grounding, and material scale.",
      "Architectural photography style, premium material rendering, cinematic natural light, editorial realism.",
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  return compact([
    `A photorealistic, highly detailed ${style} ${roomType.toLowerCase()} with ${targetColor ?? palette} finishes.`,
    "Use the uploaded photo as the composition and structural reference.",
    "Preserve the room or facade geometry, perspective, openings, and major built elements while redesigning materials, colors, furnishings, and styling.",
    "Architectural photography style, cinematic lighting, realistic materials, editorial composition, ultra-detailed decor, premium home design render.",
    customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
    `Output in a ${aspectRatio} composition.`,
    variationInstruction,
  ]);
}

export function buildStabilityNegativePrompt(args: {
  serviceType: ServiceType;
}) {
  const shared = [
    "low quality",
    "blurry",
    "cartoon",
    "illustration",
    "warped perspective",
    "distorted geometry",
    "extra windows",
    "duplicate furniture",
    "deformed architecture",
    "oversaturated",
    "text",
    "logo",
  ];

  if (args.serviceType === "paint" || args.serviceType === "floor") {
    shared.push("changes outside mask", "edited furniture", "altered lighting layout");
  }

  return shared.join(", ");
}
