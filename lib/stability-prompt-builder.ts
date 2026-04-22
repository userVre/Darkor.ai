type ServiceType = "paint" | "floor" | "redesign";

function trimOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function compact(parts: Array<string | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(" ");
}

function joinNaturalLanguage(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function buildStyleBlendDescription(style: string, styleSelections: string[]) {
  const normalizedSelections = styleSelections
    .map((value) => trimOptional(value))
    .filter((value): value is string => Boolean(value && value.toLowerCase() !== trimOptional(style)?.toLowerCase()));

  if (normalizedSelections.length === 0) {
    return style;
  }

  return `a cohesive ${joinNaturalLanguage([style, ...normalizedSelections])} architectural blend`;
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
  styleSelections?: string[];
  colorPalette: string;
  customPrompt?: string;
  targetColor?: string;
  targetSurface?: string;
  aspectRatio?: string;
  regenerate?: boolean;
  smartSuggest?: boolean;
}) {
  const roomType = trimOptional(args.roomType) ?? "space";
  const style = trimOptional(args.style) ?? "luxury contemporary";
  const normalizedStyleSelections =
    (args.styleSelections ?? [])
      .map((value) => trimOptional(value))
      .filter((value): value is string => Boolean(value));
  const styleBlend = normalizedStyleSelections.length > 0
    ? buildStyleBlendDescription(style, normalizedStyleSelections)
    : undefined;
  const palette = trimOptional(args.colorPalette) ?? style;
  const targetColor = trimOptional(args.targetColor);
  const targetSurface = trimOptional(args.targetSurface);
  const customPrompt = trimOptional(args.customPrompt);
  const aspectRatio = normalizeAspectRatio(args.aspectRatio);
  const smartSuggest = Boolean(args.smartSuggest);
  const variationInstruction = args.regenerate
    ? "Create a fresh alternate variation while preserving the same architecture, framing, and realism."
    : undefined;

  if (args.serviceType === "paint") {
    return compact([
      smartSuggest
        ? `A photorealistic, highly detailed redesign of this ${roomType.toLowerCase()} where you choose the most compatible wall paint color and finish for the space.`
        : `A photorealistic, highly detailed ${styleBlend ?? style} ${roomType.toLowerCase()} with ${targetColor ?? palette} wall finishes.`,
      styleBlend ? `Unify the room as ${styleBlend}, resolving the selected influences into one coherent high-end interior direction.` : undefined,
      targetSurface ? `Only repaint the masked ${targetSurface.toLowerCase()} area.` : "Only repaint the masked wall area.",
      "Preserve the original structure, furniture, lighting, shadows, trim, windows, decor, and camera perspective perfectly.",
      smartSuggest ? "Automatically pick the best wall color based on the room's lighting and structure, while harmonizing with furnishings and existing materials." : undefined,
      "Architectural photography style, believable paint texture, clean masking edges, cinematic lighting, premium interior render.",
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  if (args.serviceType === "floor") {
    return compact([
      smartSuggest
        ? `A photorealistic, highly detailed redesign of this ${roomType.toLowerCase()} where you choose the most compatible floor material and finish for the space.`
        : `A photorealistic, highly detailed ${styleBlend ?? style} ${roomType.toLowerCase()} with ${targetColor ?? palette} flooring tones.`,
      styleBlend ? `Unify the room as ${styleBlend}, resolving the selected influences into one coherent high-end interior direction.` : undefined,
      "Only replace the masked floor area and preserve every non-masked region exactly as photographed.",
      "Keep realistic floor perspective, seams, reflections, grounding, and material scale.",
      smartSuggest ? "Automatically pick the best floor material, tone, and finish based on the room's lighting and structure, while fitting the furnishings." : undefined,
      "Architectural photography style, premium material rendering, cinematic natural light, editorial realism.",
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  return compact([
    smartSuggest
      ? `A photorealistic, highly detailed redesign of this ${roomType.toLowerCase()} where you choose the most compatible design style, palette, and materials for the space.`
      : `A photorealistic, highly detailed ${styleBlend ?? style} ${roomType.toLowerCase()} with ${targetColor ?? palette} finishes.`,
    styleBlend ? `Unify the selected influences into ${styleBlend}, keeping the final architecture cohesive and professionally resolved.` : undefined,
    "Use the uploaded photo as the composition and structural reference.",
    smartSuggest ? "Automatically pick the best style, color palette, and material language based on the room's lighting and structure." : undefined,
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
