type ServiceType = "paint" | "floor" | "redesign" | "layout" | "replace";

export const GLOBAL_PERSPECTIVE_LOCK_INSTRUCTION =
  "STRICT PERSPECTIVE ADHERENCE: Maintain the exact camera angle, floor-to-ceiling height, and wall positions of the source photo. Do not distort the room's geometry. The output must align pixel-for-pixel with the original layout.";

export const GLOBAL_MASTERPIECE_QUALITY_INSTRUCTION =
  "Masterpiece quality: 8k resolution, cinematic architectural photography, ray-tracing, high-fidelity textures, ArchDaily style, professional design-firm rendering, physically believable shadows, no text, no labels, no captions, no watermarks.";

export const GLOBAL_REALISM_TOKEN_INJECTION =
  "8k resolution, photorealistic architectural photography, ray tracing, cinematic natural lighting, high-fidelity textures, shot on 35mm lens, global illumination, intricate details, trending on ArchDaily.";

export const GEMINI_MATERIAL_REFLECTION_INSTRUCTION =
  "In customPrompt, describe shadow behavior and material reflections in concrete detail: contact shadows, cast shadow softness, ambient occlusion, marble veining with subtle polished reflection, oak grain with warm directional highlights, and glass reflections/refractions matching the original window light and camera angle.";

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
  "balcony",
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

function isGardenRedesignContext(roomType: string) {
  return includesKeyword(roomType, GARDEN_ROOM_TYPE_KEYWORDS);
}

function buildPaintColorInstruction(args: {
  colorPalette: string;
  targetColor?: string;
  targetColorCategory?: string;
}) {
  const specificShade = trimOptional(args.targetColor);
  const colorFamily = trimOptional(args.targetColorCategory);
  const palette = trimOptional(args.colorPalette);

  if (specificShade && colorFamily && specificShade.toLowerCase() !== colorFamily.toLowerCase()) {
    return `Use the ${colorFamily} color family with the specific shade ${specificShade}; keep the family and exact shade distinct in the wall finish.`;
  }

  if (specificShade) {
    return `Use the specific wall shade ${specificShade}, not a generic approximation.`;
  }

  return `Use ${palette ?? "a professionally balanced color"} wall finishes.`;
}

export function buildDesignPrompt(args: {
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
  const targetColorCategory = trimOptional(args.targetColorCategory);
  const targetSurface = trimOptional(args.targetSurface);
  const customPrompt = trimOptional(args.customPrompt);
  const aspectRatio = normalizeAspectRatio(args.aspectRatio);
  const smartSuggest = Boolean(args.smartSuggest);
  const isExteriorRedesign = args.serviceType === "redesign" && isExteriorRedesignContext(roomType);
  const isGardenRedesign = args.serviceType === "redesign" && isGardenRedesignContext(roomType);
  const variationInstruction = args.regenerate
    ? "Create a fresh alternate variation while preserving the same architecture, framing, and realism."
    : undefined;
  const structuralLock = GLOBAL_PERSPECTIVE_LOCK_INSTRUCTION;
  const masterpieceQuality = GLOBAL_MASTERPIECE_QUALITY_INSTRUCTION;

  if (args.serviceType === "paint") {
    return compact([
      smartSuggest
        ? `A photorealistic, highly detailed redesign of this ${roomType.toLowerCase()} where you choose the most compatible wall paint color and finish for the space.`
        : `A photorealistic, highly detailed ${styleBlend ?? style} ${roomType.toLowerCase()} wall paint transformation.`,
      structuralLock,
      styleBlend ? `${styleBlend}. Resolve the selected influences into one coherent high-end interior direction.` : undefined,
      smartSuggest ? undefined : buildPaintColorInstruction({ colorPalette: palette, targetColor, targetColorCategory }),
      targetSurface ? `Redesign only the selected ${targetSurface.toLowerCase()} surface and leave all other surfaces unchanged.` : "Redesign only the primary painted surface and leave all other surfaces unchanged.",
      "Preserve the original structure, furniture, trim, windows, decor, furniture shadows on the wall, contact shadows, cast shadows, and all existing light falloff.",
      smartSuggest ? "Automatically pick the best wall color based on the room's lighting direction, color temperature, furnishings, and existing materials." : undefined,
      "Lighting Harmony: match the original window light direction and intensity so the new wall finish inherits the same highlights, gradients, and shadow edges.",
      "Believable paint texture, clean surface transitions, premium interior render.",
      masterpieceQuality,
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
      structuralLock,
      styleBlend ? `${styleBlend}. Resolve the selected influences into one coherent high-end interior direction.` : undefined,
      "Only replace the masked floor area and preserve every non-masked region exactly as photographed.",
      "Material Depth: make wood grain, stone veining, tile seams, plank direction, reflections, grounding, and material scale follow the room's true 3D perspective lines and vanishing points.",
      smartSuggest ? "Automatically pick the best floor material, tone, and finish based on the room's lighting and structure, while fitting the furnishings." : undefined,
      "Preserve the existing wall bases, furniture legs, contact shadows, lighting direction, and object grounding exactly.",
      "Premium material rendering, cinematic natural light, editorial realism.",
      masterpieceQuality,
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  if (args.serviceType === "layout") {
    return compact([
      `A photorealistic, highly detailed furniture layout optimization for this ${roomType.toLowerCase()}.`,
      structuralLock,
      "Use the uploaded room photo as the exact architectural shell and preserve the room geometry, windows, doors, ceiling, lighting direction, and camera perspective.",
      "Analyze current furniture placement. Rearrange to maximize floor area and circulation. The result must feel spacious, ergonomic, and breathable while keeping the windows and doors in their original places.",
      "Rearrange only the existing furniture and decor into a calmer, more ergonomic composition with better circulation, clearer spacing, furniture flow, spatial gain, and stronger visual balance.",
      "Do not redesign the architecture, do not change the furniture set dramatically, and do not invent a different room type.",
      "Prioritize balanced furniture placement, comfortable movement paths, clear focal points, and premium editorial realism.",
      "Believable furniture scale, natural styling, realistic shadows, refined material continuity.",
      masterpieceQuality,
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  if (args.serviceType === "replace") {
    return compact([
      `A photorealistic, highly detailed object replacement edit for this ${roomType.toLowerCase()}.`,
      structuralLock,
      "Replace only the masked object or masked area, and preserve every non-masked pixel exactly as photographed.",
      "Keep the architecture, furniture layout, lighting, shadows, reflections, perspective, and room structure unchanged outside the mask.",
      customPrompt ? `Requested replacement: ${customPrompt}.` : `Requested replacement: ${style}.`,
      "Seamless Blending: the new object must inherit the shadows, contact grounding, ambient occlusion, color temperature, glossy reflections, and light reflections of the surrounding environment perfectly.",
      "Match the new object to the room's scale, material realism, camera angle, lens perspective, and natural light so it looks originally photographed in the scene.",
      "Seamless compositing, believable contact shadows, premium realism.",
      masterpieceQuality,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  if (isGardenRedesign) {
    return compact([
      smartSuggest
        ? `A photorealistic, highly detailed resort-level garden transformation of this ${roomType.toLowerCase()} where you choose the most compatible landscape design, planting palette, hardscape materials, and outdoor lighting plan.`
        : `A photorealistic, highly detailed ${styleBlend ?? style} resort-level garden transformation of this ${roomType.toLowerCase()} with ${targetColor ?? palette} outdoor finishes.`,
      structuralLock,
      styleBlend ? `${styleBlend}. Resolve the selected influences into one cohesive high-end landscape direction.` : undefined,
      fusionResolutionInstruction,
      "Use the uploaded photo as the exact site, camera, horizon, facade, and landscape reference.",
      "Resort Vibe: create lush tropical flora, integrated LED garden lighting, layered planting, refined hardscape, curated outdoor furniture, and an ambient twilight atmosphere where appropriate.",
      "Clean Sweep: remove all foreground debris, trash, construction materials, broken paving, patchy ground, weeds, clutter, and messy overgrowth.",
      "If the photo includes a facade, treat the facade and the landscape as one single project with matching materials, premium curb appeal, and designer outdoor elements.",
      "Preserve all building positions, fence lines, steps, doors, windows, grade changes, pool edges, patio edges, and major site boundaries exactly.",
      smartSuggest ? "Automatically pick the best high-end landscape language based on the site's light, architecture, climate cues, and existing circulation." : undefined,
      masterpieceQuality,
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  if (isExteriorRedesign) {
    return compact([
      smartSuggest
        ? `A photorealistic, highly detailed total scene transformation of this ${roomType.toLowerCase()} where you choose the most compatible luxury exterior style, palette, facade materials, and landscape language for the entire property.`
        : `A photorealistic, highly detailed total scene transformation of this ${styleBlend ?? style} ${roomType.toLowerCase()} with ${targetColor ?? palette} finishes across the facade and immediate landscape.`,
      structuralLock,
      styleBlend ? `${styleBlend}. Keep the final architecture cohesive and professionally resolved as one unified exterior project.` : undefined,
      fusionResolutionInstruction,
      "Use the uploaded photo as the exact composition, site, and structural reference.",
      smartSuggest ? "Automatically pick the best high-end exterior style, palette, materials, planting language, and hardscape detailing based on the building massing, light, and context." : undefined,
      "You are a Master Architect. When redesigning this exterior, you must process the ENTIRE frame.",
      "Clean Sweep: Remove all visible foreground debris, trash, construction materials, patchy ground, weeds, muddy areas, messy overgrowth, and visual clutter around the property.",
      "Redesign both the Building Facade and the Immediate Landscaping, including the garden, driveway, entry path, edging, and foreground, as one single architectural project with a cohesive high-end luxury resort aesthetic.",
      "Do not leave any area of the original photo unrefined. Replace all low-quality elements with premium textures, refined hardscape materials, manicured lawns, curated planting, designer exterior decor, and polished architectural detailing.",
      "Preserve the exact building footprint, rooflines, openings, camera angle, horizon line, lens feel, and spatial relationships so the house does not shift, stretch, rotate, or change position in slider comparison.",
      "Maintain perspective integrity and the original massing while upgrading the facade, entry sequence, driveway, and landscape composition into a clean, polished masterpiece with no remnants of the original mess.",
      "Render the final result like a professional architectural magazine image with luxury-resort-level curb appeal, immaculate facades, clean lawns, refined shadows, premium materials, and flawless site styling.",
      masterpieceQuality,
      customPrompt ? `Additional direction: ${customPrompt}.` : undefined,
      `Output in a ${aspectRatio} composition.`,
      variationInstruction,
    ]);
  }

  return compact([
    smartSuggest
      ? `A photorealistic, highly detailed redesign of this ${roomType.toLowerCase()} where you choose the most compatible design style, palette, and materials for the space.`
      : `A photorealistic, highly detailed ${styleBlend ?? style} ${roomType.toLowerCase()} with ${targetColor ?? palette} finishes.`,
    structuralLock,
    styleBlend ? `${styleBlend}. Keep the final architecture cohesive and professionally resolved.` : undefined,
    fusionResolutionInstruction,
    "Use the uploaded photo as the composition and structural reference.",
    smartSuggest ? "Automatically pick the best style, color palette, and material language based on the room's lighting and structure." : undefined,
    "Lighting Harmony: match the original window light direction, exposure, shadow softness, and color temperature while upgrading furniture flow and spatial gain.",
    "Preserve the room or facade geometry, perspective, openings, and major built elements while redesigning materials, colors, furnishings, and styling.",
    "Contemporary professional staging, cinematic lighting, realistic materials, editorial composition, ultra-detailed decor, premium home design render.",
    masterpieceQuality,
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
    "visible text",
    "labels",
    "captions",
    "logo",
    "watermark",
    "split-screen",
    "comparison labels",
  ];

  const roomType = trimOptional(args.roomType) ?? "";
  const isExteriorRedesign = args.serviceType === "redesign" && isExteriorRedesignContext(roomType);
  const isGardenRedesign = args.serviceType === "redesign" && isGardenRedesignContext(roomType);

  if (args.serviceType === "paint" || args.serviceType === "floor" || args.serviceType === "replace") {
    shared.push("changes outside selected surface", "edited furniture", "altered lighting layout");
  }

  if (args.serviceType === "layout") {
    shared.push("missing furniture", "extra furniture", "floating furniture", "changed architecture", "altered window placement");
  }

  if (isExteriorRedesign || isGardenRedesign) {
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
      "original-state mess",
    );
  }

  return shared.join(", ");
}
