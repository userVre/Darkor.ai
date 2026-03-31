export type FeaturedTryItExample = {
  aspectRatioId: "post" | "story" | "landscape";
  finishId?: "matte" | "glossy" | "satin" | null;
  id: string;
  imageSource: number;
  modeId?: "preserve" | "renovate" | null;
  paletteId?: string | null;
  prompt: string;
  room: string;
  serviceParam: "interior" | "facade" | "garden" | "paint" | "floor";
  style: string;
};

export const FEATURED_TRY_IT_EXAMPLES: FeaturedTryItExample[] = [
  {
    id: "interior-design",
    serviceParam: "interior",
    imageSource: require("../assets/media/discover/home/home-dining-room.jpg"),
    room: "Dining Room",
    style: "Luxury",
    paletteId: "terracotta",
    modeId: "renovate",
    prompt:
      "Layer sculptural pendant lighting, warm walnut detailing, curved upholstered seating, and a polished editorial dining atmosphere while keeping the layout believable.",
    aspectRatioId: "landscape",
  },
  {
    id: "exterior-design",
    serviceParam: "facade",
    imageSource: require("../assets/media/discover/exterior/exterior-modern-villa.jpg"),
    room: "House",
    style: "Modern",
    paletteId: "gray",
    prompt:
      "Refine the facade with slim black framing, warm wood soffits, integrated landscape lighting, and premium curb appeal that still feels buildable.",
    aspectRatioId: "landscape",
  },
  {
    id: "garden-design",
    serviceParam: "garden",
    imageSource: require("../assets/media/discover/garden/garden-fireside-patio.jpg"),
    room: "Patio",
    style: "Mediterranean",
    paletteId: "garden-terracotta",
    prompt:
      "Create a resort-style patio with limestone paving, olive-toned planting, layered lounge seating, and a glowing sunset entertainment mood.",
    aspectRatioId: "landscape",
  },
  {
    id: "paint",
    serviceParam: "paint",
    imageSource: require("../assets/media/discover/wall-scenes/sage-green-suite.jpg"),
    room: "Bedroom",
    style: "Sage Green",
    finishId: "satin",
    prompt:
      "Apply a soft designer sage finish to the main walls while preserving trim, bedding, natural daylight, and the calm boutique-hotel feeling of the room.",
    aspectRatioId: "post",
  },
  {
    id: "floor-restyle",
    serviceParam: "floor",
    imageSource: require("../assets/media/discover/floor-scenes/polished-carrara-marble.jpg"),
    room: "Living Room",
    style: "Marble",
    finishId: "glossy",
    prompt:
      "Replace the flooring with bright Carrara-style marble featuring subtle natural veining, crisp slab alignment, and luxury-hotel polish.",
    aspectRatioId: "landscape",
  },
] as const;

export const FEATURED_TRY_IT_BY_ID = new Map(
  FEATURED_TRY_IT_EXAMPLES.map((example) => [example.id, example] as const),
);
