type ServiceType = "paint" | "floor" | "redesign" | "layout" | "replace";

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

function trimOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function compact(parts: Array<string | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(" ");
}

function includesKeyword(value: string, keywords: readonly string[]) {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
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

  return `A fusion of ${joinNaturalLanguage([style, ...normalizedSelections])} styles`;
}

function buildFusionResolutionInstruction(style: string, styleSelections: string[]) {
  const normalizedSelections = [style, ...styleSelections]
    .map((value) => trimOptional(value))
    .filter((value): value is string => Boolean(value));

  if (normalizedSelections.length < 2) {
    return undefined;
  }

  return `Blend ${joinNaturalLanguage(normalizedSelections)} into one seamless architectural direction with balanced forms, materials, detailing, and color transitions.`;
}

export function normalizeAspectRatio(aspectRatio?: string | null) {
  const trimmed = aspectRatio?.trim();
  if (!trimmed) return "1:1";
  return /^\d+:\d+$/.test(trimmed) ? trimmed : "1:1";
}

function isExteriorRedesignContext(roomType: string) {
  return includesKeyword(roomType, EXTERIOR_ROOM_TYPE_KEYWORDS);
}

export function buildDesignPrompt(args: {
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
  const fusionResolutionInstruction = normalizedStyleSelections.length > 0
    ? buildFusionResolutionInstruction(style, normalizedStyleSelections)
    : undefined;
  const palette = trimOptional(args.colorPalette) ?? style;
  const targetColor = trimOptional(args.targetColor);
  const targetSurface = trimOptional(args.targetSurface);
  const customPrompt = trimOptional(args.customPrompt);
  const aspectRatio = normalizeAspectRatio(args.aspectRatio);
  const smartSuggest = Boolean(args.smartSuggest);
  const isExteriorRedesign = args.serviceType === "redesign" && isExteriorRedesignContext(roomType);
  const variationInstruction = args.regenerate
    ? "Create a fresh alternate variation while preserving the same architecture, framing, and realism."
    : undefined;

  if (args.serviceType === "paint") {
    return compact([
      smartSuggest
        ? `A photorealistic, highly detailed redesign of this ${roomType.toLowerCase()} where you choose the most compatible wall paint color and finish for the space.`
        : `A photorealistic, highly detailed ${styleBlend ?? style} ${roomType.toLowerCase()} with ${targetColor ?? palette} wall finishes.`,
      styleBlend ? `${styleBlend}. Resolve the selected influences into one coherent high-end interior direction.` : undefined,
      targetSurface ? `Redesign only the selected ${targetSurface.toLowerCase()} surface and leave all other surfaces unchanged.` : "Redesign only the primary painted surface and leave all other surfaces unchanged.",
      "Preserve the original structure, furniture, lighting, shadows, trim, windows, decor, and camera perspective perfectly.",
      smartSuggest ? "Automatically pick the best wall color based on the room's lighting and structure, while harmonizing with furnishings and existing materials." : undefined,
      "Architectural photography style, believable paint texture, clean surface transitions, cinematic lighting, premium interior render.",
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
      styleBlend ? `${styleBlend}. Resolve the selected influences into one coherent high-end interior direction.` : undefined,
      "Only replace the masked floor area and preserve every non-masked region exactly as photographed.",
      "Keep realistic floor perspective, seams, reflections, grounding, and material scale.",
      smartSuggest ? "Automatically pick the best floor material, tone, and finish based on the room's lighting and structure, while fitting the furnishings." : undefined,
      "Architectural photography style, premium material rendering, cinematic natural light, editorial realism.",
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  if (args.serviceType === "layout") {
    return compact([
      `A photorealistic, highly detailed furniture layout optimization for this ${roomType.toLowerCase()}.`,
      "Use the uploaded room photo as the exact architectural shell and preserve the room geometry, windows, doors, ceiling, lighting direction, and camera perspective.",
      "Rearrange only the existing furniture and decor into a calmer, more ergonomic composition with better circulation, clearer spacing, and stronger spatial flow.",
      "Do not redesign the architecture, do not change the furniture set dramatically, and do not invent a different room type.",
      "Prioritize balanced furniture placement, comfortable movement paths, clear focal points, and premium editorial realism.",
      "Architectural photography style, believable furniture scale, natural styling, realistic shadows, refined material continuity.",
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  if (args.serviceType === "replace") {
    return compact([
      `A photorealistic, highly detailed object replacement edit for this ${roomType.toLowerCase()}.`,
      "Replace only the masked object or masked area, and preserve every non-masked pixel exactly as photographed.",
      "Keep the architecture, furniture layout, lighting, shadows, reflections, perspective, and room structure unchanged outside the mask.",
      customPrompt ? `Requested replacement: ${customPrompt}.` : `Requested replacement: ${style}.`,
      "Match the new object to the room's scale, material realism, camera angle, and natural light so it looks originally photographed in the scene.",
      "Architectural photography style, seamless compositing, believable contact shadows, premium realism.",
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  if (isExteriorRedesign) {
    return compact([
      smartSuggest
        ? `A photorealistic, highly detailed total scene transformation of this ${roomType.toLowerCase()} where you choose the most compatible luxury exterior style, palette, facade materials, and landscape language for the entire property.`
        : `A photorealistic, highly detailed total scene transformation of this ${styleBlend ?? style} ${roomType.toLowerCase()} with ${targetColor ?? palette} finishes across the facade and immediate landscape.`,
      styleBlend ? `${styleBlend}. Keep the final architecture cohesive and professionally resolved as one unified exterior project.` : undefined,
      fusionResolutionInstruction,
      "Use the uploaded photo as the exact composition, site, and structural reference.",
      smartSuggest ? "Automatically pick the best high-end exterior style, palette, materials, planting language, and hardscape detailing based on the building massing, light, and context." : undefined,
      "You are a Master Architect. When redesigning this exterior, you must process the ENTIRE frame.",
      "Action: Remove all visible debris, trash, construction materials, patchy ground, weeds, muddy areas, and messy overgrowth in the foreground and around the property.",
      "Redesign both the Building Facade and the Immediate Landscaping, including the garden, driveway, entry path, edging, and foreground, as one single architectural project with a cohesive high-end luxury resort aesthetic.",
      "Do not leave any area of the original photo unrefined. Replace all low-quality elements with premium textures, refined hardscape materials, manicured lawns, curated planting, designer exterior decor, and polished architectural detailing.",
      "Perspective Lock: preserve the exact building footprint, rooflines, openings, camera angle, horizon line, lens feel, and spatial relationships so the house does not shift, stretch, rotate, or change position when compared with the original in a before/after slider.",
      "Maintain perspective integrity and the original massing while upgrading the facade, entry sequence, driveway, and landscape composition into a clean, polished masterpiece with no remnants of the original mess.",
      "Render the final result like a professional 4K architectural magazine image with luxury-resort-level curb appeal, immaculate facades, clean lawns, refined shadows, premium materials, and flawless site styling.",
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  return compact([
    smartSuggest
      ? `A photorealistic, highly detailed redesign of this ${roomType.toLowerCase()} where you choose the most compatible design style, palette, and materials for the space.`
      : `A photorealistic, highly detailed ${styleBlend ?? style} ${roomType.toLowerCase()} with ${targetColor ?? palette} finishes.`,
    styleBlend ? `${styleBlend}. Keep the final architecture cohesive and professionally resolved.` : undefined,
    fusionResolutionInstruction,
    "Use the uploaded photo as the composition and structural reference.",
    smartSuggest ? "Automatically pick the best style, color palette, and material language based on the room's lighting and structure." : undefined,
    "Preserve the room or facade geometry, perspective, openings, and major built elements while redesigning materials, colors, furnishings, and styling.",
    "Architectural photography style, cinematic lighting, realistic materials, editorial composition, ultra-detailed decor, premium home design render.",
    customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
    `Output in a ${aspectRatio} composition.`,
    variationInstruction,
  ]);
}

export function buildDesignNegativePrompt(args: {
  serviceType: ServiceType;
  roomType?: string;
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

  const roomType = trimOptional(args.roomType) ?? "";
  const isExteriorRedesign = args.serviceType === "redesign" && isExteriorRedesignContext(roomType);

  if (args.serviceType === "paint" || args.serviceType === "floor" || args.serviceType === "replace") {
    shared.push("changes outside selected surface", "edited furniture", "altered lighting layout");
  }

  if (args.serviceType === "layout") {
    shared.push("missing furniture", "extra furniture", "floating furniture", "changed architecture", "altered window placement");
  }

  if (isExteriorRedesign) {
    shared.push(
      "unclean foreground",
      "leftover debris",
      "trash",
      "construction clutter",
      "messy overgrowth",
      "patchy lawn",
      "muddy driveway",
      "unfinished landscaping",
      "facade remnants",
      "shifted house",
      "changed building position",
      "warped driveway",
      "misaligned rooflines",
      "crooked facade",
      "before-state mess",
    );
  }

  return shared.join(", ");
}
