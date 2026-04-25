import {palette} from "@/styles/theme";
import type {ImageSourcePropType} from "react-native";

export type DiscoverSectionId = "home" | "wall" | "floor" | "garden" | "exterior";
export type DiscoverService = "interior" | "garden" | "exterior" | "floor" | "paint";

export type DiscoverTile = {
  id: string;
  title: string;
  previewTitle?: string;
  subtitle: string;
  spaceType: string;
  style: string;
  service: DiscoverService;
  image: ImageSourcePropType;
  startStep?: "1" | "2" | "3" | "4";
  presetStyle?: string;
  presetRoom?: string;
};

export type DiscoverSection = {
  id: DiscoverSectionId;
  title: string;
  description: string;
  items: DiscoverTile[];
};

export type WallColorOption = {
  id: string;
  title: string;
  value: string;
  description: string;
  image: ImageSourcePropType;
  discoverSubtitle: string;
};

export type ColorSwatch = {
  id: string;
  label: string;
  value: string;
};

export type ColorCategory = {
  id: string;
  title: string;
  colors: ColorSwatch[];
};

export type FloorMaterialOption = {
  id: string;
  title: string;
  description: string;
  promptLabel: string;
  image: ImageSourcePropType;
  discoverSubtitle: string;
};

export const WALL_COLOR_OPTIONS: WallColorOption[] = [
  {
    id: "sage-green",
    title: "Sage Green",
    value: palette.sageGreen,
    description: "Soft green calm for bright, polished living spaces.",
    image: require("../assets/media/discover/wall-scenes/sage-green-suite.jpg"),
    discoverSubtitle: "Wall / Botanical Calm",
  },
  {
    id: "midnight-navy",
    title: "Midnight Navy",
    value: palette.midnightNavy,
    description: "Tailored navy depth with crisp architectural contrast.",
    image: require("../assets/media/discover/wall-scenes/midnight-navy-bedroom.jpg"),
    discoverSubtitle: "Wall / Tailored Contrast",
  },
  {
    id: "terracotta-glow",
    title: "Terracotta Glow",
    value: palette.terracottaGlow,
    description: "Warm clay color with grounded, editorial energy.",
    image: require("../assets/media/discover/wall-scenes/terracotta-dining.jpg"),
    discoverSubtitle: "Wall / Warm Clay",
  },
  {
    id: "dusty-rose",
    title: "Dusty Rose",
    value: palette.dustyRose,
    description: "Muted blush warmth with soft boutique appeal.",
    image: require("../assets/media/discover/wall-scenes/dusty-rose-retreat.jpg"),
    discoverSubtitle: "Wall / Boutique Blush",
  },
  {
    id: "gallery-charcoal",
    title: "Gallery Charcoal",
    value: palette.galleryCharcoal,
    description: "Refined charcoal for moody, art-forward rooms.",
    image: require("../assets/media/discover/wall-scenes/gallery-charcoal-lounge.jpg"),
    discoverSubtitle: "Wall / Moody Gallery",
  },
  {
    id: "soft-ivory",
    title: "Soft Ivory",
    value: palette.softIvory,
    description: "Luminous neutral that keeps rooms light, never flat.",
    image: require("../assets/media/discover/wall-scenes/soft-ivory-kitchen.jpg"),
    discoverSubtitle: "Wall / Quiet Neutral",
  },
  {
    id: "olive-grove",
    title: "Olive Grove",
    value: palette.oliveGrove,
    description: "Earthy olive depth with a grounded designer mood.",
    image: require("../assets/media/discover/wall-scenes/deep-olive-study.jpg"),
    discoverSubtitle: "Wall / Earthy Depth",
  },
  {
    id: "lavender-mist",
    title: "Lavender Mist",
    value: palette.lavenderMist,
    description: "Soft violet haze for elevated pastel rooms.",
    image: require("../assets/media/discover/wall-scenes/lavender-mist-bath.jpg"),
    discoverSubtitle: "Wall / Soft Pastel",
  },
  {
    id: "pearl-gray",
    title: "Pearl Gray",
    value: palette.pearlGray,
    description: "Light tonal gray with polished everyday flexibility.",
    image: require("../assets/media/discover/wall-scenes/pearl-gray-salon.jpg"),
    discoverSubtitle: "Wall / Modern Neutral",
  },
];

export const WALL_COLOR_CATEGORIES: ColorCategory[] = [
  {
    id: "calm-neutrals",
    title: "Calm Neutrals",
    colors: [
      { id: "soft-ivory", label: "Soft Ivory", value: palette.softIvory },
      { id: "pearl-gray", label: "Pearl Gray", value: palette.pearlGray },
      { id: "sage-green", label: "Sage Green", value: palette.sageGreen },
    ],
  },
  {
    id: "boutique-pastels",
    title: "Boutique Pastels",
    colors: [
      { id: "dusty-rose", label: "Dusty Rose", value: palette.dustyRose },
      { id: "lavender-mist", label: "Lavender Mist", value: palette.lavenderMist },
      { id: "terracotta-glow", label: "Terracotta Glow", value: palette.terracottaGlow },
    ],
  },
  {
    id: "architectural-depth",
    title: "Architectural Depth",
    colors: [
      { id: "midnight-navy", label: "Midnight Navy", value: palette.midnightNavy },
      { id: "gallery-charcoal", label: "Gallery Charcoal", value: palette.galleryCharcoal },
      { id: "olive-grove", label: "Olive Grove", value: palette.oliveGrove },
    ],
  },
];

export const FLOOR_MATERIAL_OPTIONS: FloorMaterialOption[] = [
  {
    id: "natural-oak",
    title: "Natural Oak",
    description: "Airy oak planks with soft natural grain.",
    promptLabel: "light natural oak flooring with wide-plank grain detail",
    image: require("../assets/media/discover/floor-scenes/natural-oak-parquet.jpg"),
    discoverSubtitle: "Floor / Light Wood",
  },
  {
    id: "walnut-wood",
    title: "Walnut Wood",
    description: "Deep walnut planks with rich tailored contrast.",
    promptLabel: "luxury walnut wood flooring with rich deep grain",
    image: require("../assets/media/discover/floor-scenes/heritage-walnut-plank.jpg"),
    discoverSubtitle: "Floor / Dark Wood",
  },
  {
    id: "carrara-marble",
    title: "Carrara Marble",
    description: "Bright stone veining with a calm luxe finish.",
    promptLabel: "carrara marble flooring with elegant soft veining",
    image: require("../assets/media/discover/floor-scenes/polished-carrara-marble.jpg"),
    discoverSubtitle: "Floor / Polished Stone",
  },
  {
    id: "polished-concrete",
    title: "Polished Concrete",
    description: "Smooth concrete sheen with urban gallery calm.",
    promptLabel: "polished concrete flooring with premium smooth texture",
    image: require("../assets/media/discover/floor-scenes/industrial-gray-concrete.jpg"),
    discoverSubtitle: "Floor / Industrial Minimal",
  },
  {
    id: "herringbone-oak",
    title: "Herringbone Oak",
    description: "Classic oak pattern with warm directional movement.",
    promptLabel: "herringbone oak parquet flooring with premium pattern definition",
    image: require("../assets/media/discover/floor-scenes/walnut-chevron.jpg"),
    discoverSubtitle: "Floor / Patterned Wood",
  },
  {
    id: "terracotta-tile",
    title: "Terracotta Tile",
    description: "Earthy clay warmth with handcrafted character.",
    promptLabel: "terracotta tile flooring with warm clay color variation",
    image: require("../assets/media/discover/floor-scenes/terracotta-atelier-tile.jpg"),
    discoverSubtitle: "Floor / Mediterranean Clay",
  },
  {
    id: "slate-tile",
    title: "Slate Tile",
    description: "Dark slate with a crisp large-format finish.",
    promptLabel: "dark slate tile flooring with large format stone slabs",
    image: require("../assets/media/discover/floor-scenes/modern-slate-tile.jpg"),
    discoverSubtitle: "Floor / Dark Stone",
  },
  {
    id: "plush-carpet",
    title: "Plush Carpet",
    description: "Soft cream carpet with a quiet, cozy feel.",
    promptLabel: "luxury plush carpet flooring in a soft cream tone",
    image: require("../assets/media/discover/floor-scenes/plush-ivory-carpet.jpg"),
    discoverSubtitle: "Floor / Soft Texture",
  },
  {
    id: "weathered-oak",
    title: "Weathered Oak",
    description: "Mid-tone oak with a gently aged finish.",
    promptLabel: "weathered oak flooring with subtle aged grain",
    image: require("../assets/media/discover/floor-scenes/weathered-oak-studio.jpg"),
    discoverSubtitle: "Floor / Rustic Warmth",
  },
];

const HOME_ITEMS: DiscoverTile[] = [
  {
    id: "home-serene-lounge",
    title: "Serene Lounge",
    subtitle: "Living Room / Soft Minimal",
    spaceType: "Living Room",
    style: "Soft Minimal",
    service: "interior",
    image: require("../assets/media/discover/home/interior-after-serene-lounge.jpg"),
  },
  {
    id: "home-moody-club",
    title: "Moody Club Room",
    subtitle: "Living Room / Moody Luxe",
    spaceType: "Living Room",
    style: "Moody Luxe",
    service: "interior",
    image: require("../assets/media/discover/home/interior-after-moody-club.jpg"),
  },
  {
    id: "home-organic-living",
    title: "Organic Living",
    subtitle: "Living Room / Warm Organic",
    spaceType: "Living Room",
    style: "Warm Organic",
    service: "interior",
    image: require("../assets/media/discover/home/interior-after-organic-living.jpg"),
  },
  {
    id: "home-grand-salon",
    title: "Grand Salon",
    subtitle: "Living Room / Luxe Marble",
    spaceType: "Living Room",
    style: "Luxe Marble",
    service: "interior",
    image: require("../assets/media/discover/home/interior-after-grand-salon.jpg"),
  },
  {
    id: "home-editorial-lounge",
    title: "Editorial Lounge",
    subtitle: "Gaming Room / Cyberpunk",
    spaceType: "Gaming Room",
    style: "Cyberpunk",
    service: "interior",
    image: require("../assets/media/discover/home/interior-after-editorial-lounge.jpg"),
  },
];

const WALL_ITEMS: DiscoverTile[] = [
  {
    id: "wall-sage-plaster",
    title: "Sage Plaster Wall",
    subtitle: "Textured Wall / Sage Green",
    spaceType: "Textured Wall",
    style: "Sage Green",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/wall-after-sage-plaster.jpg"),
    startStep: "3",
    presetStyle: "Sage Green",
    presetRoom: "Living Room",
  },
  {
    id: "wall-linear-slats",
    title: "Linear Slat Feature",
    subtitle: "Slatted Wall / Charcoal",
    spaceType: "Slatted Wall",
    style: "Charcoal",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/wall-after-linear-slats.jpg"),
    startStep: "3",
    presetStyle: "Charcoal",
    presetRoom: "Living Room",
  },
  {
    id: "wall-veined-marble",
    title: "Veined Marble Wall",
    subtitle: "Marble Wall / Soft Ivory",
    spaceType: "Marble Wall",
    style: "Soft Ivory",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/wall-after-veined-marble.jpg"),
    startStep: "3",
    presetStyle: "Soft Ivory",
    presetRoom: "Living Room",
  },
  {
    id: "wall-minimal-concrete",
    title: "Minimal Concrete Wall",
    subtitle: "Concrete Wall / Charcoal",
    spaceType: "Concrete Wall",
    style: "Charcoal",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/wall-after-minimal-concrete.jpg"),
    startStep: "3",
    presetStyle: "Charcoal",
    presetRoom: "Outside Wall",
  },
  {
    id: "wall-botanical-mural",
    title: "Botanical Mural Wall",
    subtitle: "Mural Wall / Olive Moss",
    spaceType: "Mural Wall",
    style: "Olive Moss",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/wall-after-botanical-mural.jpg"),
    startStep: "3",
    presetStyle: "Olive Moss",
    presetRoom: "Living Room",
  },
];

const FLOOR_ITEMS: DiscoverTile[] = [
  {
    id: "floor-heritage-herringbone",
    title: "Heritage Herringbone",
    subtitle: "Wood Floor / Walnut Wood",
    spaceType: "Wood Floor",
    style: "Walnut Wood",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/floor-after-heritage-herringbone.jpg"),
    startStep: "3",
    presetStyle: "Walnut Wood",
    presetRoom: "Living Room",
  },
  {
    id: "floor-carrara-marble",
    title: "Carrara Marble Flow",
    subtitle: "Marble Floor / Carrara Marble",
    spaceType: "Marble Floor",
    style: "Carrara Marble",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/floor-after-carrara-marble.jpg"),
    startStep: "3",
    presetStyle: "Carrara Marble",
    presetRoom: "Living Room",
  },
  {
    id: "floor-satin-concrete",
    title: "Satin Concrete",
    subtitle: "Concrete Floor / Polished Concrete",
    spaceType: "Concrete Floor",
    style: "Polished Concrete",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/floor-after-satin-concrete.jpg"),
    startStep: "3",
    presetStyle: "Polished Concrete",
    presetRoom: "Living Room",
  },
  {
    id: "floor-walnut-gloss",
    title: "Walnut Gloss",
    subtitle: "Gloss Wood / Walnut Wood",
    spaceType: "Gloss Wood",
    style: "Walnut Wood",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/floor-after-walnut-gloss.jpg"),
    startStep: "3",
    presetStyle: "Walnut Wood",
    presetRoom: "Living Room",
  },
  {
    id: "floor-soft-limestone",
    title: "Soft Limestone",
    subtitle: "Stone Floor / Polished Concrete",
    spaceType: "Stone Floor",
    style: "Polished Concrete",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/floor-after-soft-limestone.jpg"),
    startStep: "3",
    presetStyle: "Polished Concrete",
    presetRoom: "Living Room",
  },
];

const GARDEN_ITEMS: DiscoverTile[] = [
  {
    id: "garden-infinity-pool",
    title: "Infinity Pool",
    subtitle: "Infinity Pool / Coastal Luxe",
    spaceType: "Infinity Pool",
    style: "Coastal Luxe",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-after-infinity-pool.jpg"),
  },
  {
    id: "garden-waterfall-court",
    title: "Waterfall Court",
    subtitle: "Waterfall Garden / Zen Luxury",
    spaceType: "Waterfall Garden",
    style: "Zen Luxury",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-after-waterfall-court.jpg"),
  },
  {
    id: "garden-sunset-fire-pit",
    title: "Sunset Fire Pit",
    subtitle: "Fire Pit Lounge / Resort Sunset",
    spaceType: "Fire Pit Lounge",
    style: "Resort Sunset",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-after-sunset-fire-pit.jpg"),
  },
  {
    id: "garden-tropical-pool-lounge",
    title: "Tropical Pool Lounge",
    subtitle: "Pool Lounge / Tropical Escape",
    spaceType: "Pool Lounge",
    style: "Tropical Escape",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-after-tropical-pool-lounge.jpg"),
  },
  {
    id: "garden-luminous-garden-walk",
    title: "Luminous Garden Walk",
    subtitle: "Garden Walk / Evening Glow",
    spaceType: "Garden Walk",
    style: "Evening Glow",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-after-luminous-garden-walk.jpg"),
  },
];

const EXTERIOR_ITEMS: DiscoverTile[] = [
  {
    id: "exterior-modern-house-day",
    title: "Modern House",
    subtitle: "Modern House / Daylight Minimal",
    spaceType: "Modern House",
    style: "Daylight Minimal",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-after-modern-house-day.jpg"),
  },
  {
    id: "exterior-modern-house-night",
    title: "Modern House Night",
    subtitle: "Modern House / Evening Luxe",
    spaceType: "Modern House",
    style: "Evening Luxe",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-after-modern-house-night.jpg"),
  },
  {
    id: "exterior-stone-villa",
    title: "Stone Villa",
    subtitle: "Villa / Mediterranean",
    spaceType: "Villa",
    style: "Mediterranean",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-after-stone-villa.jpg"),
  },
  {
    id: "exterior-glass-office",
    title: "Glass Office",
    subtitle: "Office Building / Minimalist",
    spaceType: "Office Building",
    style: "Minimalist",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-after-glass-office.jpg"),
  },
  {
    id: "exterior-eco-apartments",
    title: "Eco Apartments",
    subtitle: "Apartment Block / Eco Futurist",
    spaceType: "Apartment Block",
    style: "Eco Futurist",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-after-eco-apartments.jpg"),
  },
];

export const DISCOVER_SECTIONS: DiscoverSection[] = [
  {
    id: "home",
    title: "Interior",
    description: "Designer-led rooms across living, sleep, dining, work, and entertainment.",
    items: HOME_ITEMS,
  },
  {
    id: "exterior",
    title: "Exterior",
    description: "Facade inspiration from modern villas, urban blocks, offices, and retail shells.",
    items: EXTERIOR_ITEMS,
  },
  {
    id: "garden",
    title: "Garden",
    description: "Outdoor lounges, terraces, pools, decks, and resort-minded garden scenes.",
    items: GARDEN_ITEMS,
  },
  {
    id: "wall",
    title: "Wall Inspiration",
    description: "Real-room paint references that open directly into Smart Wall Paint with the finish already preselected.",
    items: WALL_ITEMS,
  },
  {
    id: "floor",
    title: "Floor Styles",
    description: "Premium flooring references curated from real interiors and mapped directly into the Floor Restyle workflow.",
    items: FLOOR_ITEMS,
  },
];
