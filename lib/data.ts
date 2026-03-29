import type { ImageSourcePropType } from "react-native";
import { palette } from "@/styles/theme";

export type DiscoverSectionId = "home" | "wall" | "floor" | "garden" | "exterior";
export type DiscoverService = "interior" | "garden" | "exterior" | "floor" | "paint";

export type DiscoverTile = {
  id: string;
  title: string;
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
    id: "home-kitchen",
    title: "Marble Kitchen",
    subtitle: "Kitchen / Modern",
    spaceType: "Kitchen",
    style: "Modern",
    service: "interior",
    image: require("../assets/media/discover/home/home-kitchen.jpg"),
  },
  {
    id: "home-living-room",
    title: "Everyday Living",
    subtitle: "Living Room / Luxury",
    spaceType: "Living Room",
    style: "Luxury",
    service: "interior",
    image: require("../assets/media/discover/home/home-living-room.jpg"),
  },
  {
    id: "home-master-suite",
    title: "Serene Suite",
    subtitle: "Bedroom / Minimalist",
    spaceType: "Bedroom",
    style: "Minimalist",
    service: "interior",
    image: require("../assets/media/discover/home/home-master-suite.jpg"),
  },
  {
    id: "home-bathroom",
    title: "Spa Bathroom",
    subtitle: "Bathroom / Luxury",
    spaceType: "Bathroom",
    style: "Luxury",
    service: "interior",
    image: require("../assets/media/discover/home/home-bathroom.jpg"),
  },
  {
    id: "home-dining-room",
    title: "Formal Dining",
    subtitle: "Dining Room / Neo Classic",
    spaceType: "Dining Room",
    style: "Neo Classic",
    service: "interior",
    image: require("../assets/media/discover/home/home-dining-room.jpg"),
  },
  {
    id: "home-home-office",
    title: "Executive Office",
    subtitle: "Home Office / Modern",
    spaceType: "Home Office",
    style: "Modern",
    service: "interior",
    image: require("../assets/media/discover/home/home-home-office.jpg"),
  },
  {
    id: "home-home-theater",
    title: "Private Cinema",
    subtitle: "Home Theater / Cyberpunk",
    spaceType: "Home Theater",
    style: "Cyberpunk",
    service: "interior",
    image: require("../assets/media/discover/home/home-home-theater.jpg"),
  },
  {
    id: "home-library",
    title: "Collected Library",
    subtitle: "Library / Vintage",
    spaceType: "Library",
    style: "Vintage",
    service: "interior",
    image: require("../assets/media/discover/home/home-library.jpg"),
  },
  {
    id: "home-gaming-room",
    title: "Gaming Lounge",
    subtitle: "Gaming Room / Cyberpunk",
    spaceType: "Gaming Room",
    style: "Cyberpunk",
    service: "interior",
    image: require("../assets/media/discover/home/home-gaming-room.jpg"),
  },
  {
    id: "home-hall",
    title: "Gallery Hall",
    subtitle: "Hall / Japandi",
    spaceType: "Hall",
    style: "Japandi",
    service: "interior",
    image: require("../assets/media/discover/home/home-hall.jpg"),
  },
  {
    id: "home-laundry",
    title: "Laundry Studio",
    subtitle: "Laundry / Scandinavian",
    spaceType: "Laundry",
    style: "Scandinavian",
    service: "interior",
    image: require("../assets/media/discover/home/home-laundry.jpg"),
  },
  {
    id: "home-nursery",
    title: "Nursery Calm",
    subtitle: "Nursery / Scandinavian",
    spaceType: "Nursery",
    style: "Scandinavian",
    service: "interior",
    image: require("../assets/media/discover/home/home-nursery.jpg"),
  },
  {
    id: "home-study",
    title: "Quiet Study",
    subtitle: "Study / Midcentury",
    spaceType: "Study",
    style: "Midcentury",
    service: "interior",
    image: require("../assets/media/discover/home/home-study.jpg"),
  },
];

const WALL_ITEMS: DiscoverTile[] = [
  {
    id: "wall-sage-green-suite",
    title: "Sage Green Suite",
    subtitle: "Living Room / Smart Wall Paint",
    spaceType: "Living Room",
    style: "Sage Green",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/sage-green-suite.jpg"),
    startStep: "3",
    presetStyle: "Sage Green",
    presetRoom: "Wall",
  },
  {
    id: "wall-midnight-navy-bedroom",
    title: "Midnight Navy Bedroom",
    subtitle: "Bedroom / Smart Wall Paint",
    spaceType: "Bedroom",
    style: "Midnight Navy",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/midnight-navy-bedroom.jpg"),
    startStep: "3",
    presetStyle: "Midnight Navy",
    presetRoom: "Wall",
  },
  {
    id: "wall-terracotta-dining",
    title: "Terracotta Dining",
    subtitle: "Dining Room / Smart Wall Paint",
    spaceType: "Dining Room",
    style: "Terracotta Glow",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/terracotta-dining.jpg"),
    startStep: "3",
    presetStyle: "Terracotta Glow",
    presetRoom: "Wall",
  },
  {
    id: "wall-dusty-rose-retreat",
    title: "Dusty Rose Retreat",
    subtitle: "Bedroom / Smart Wall Paint",
    spaceType: "Bedroom",
    style: "Dusty Rose",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/dusty-rose-retreat.jpg"),
    startStep: "3",
    presetStyle: "Dusty Rose",
    presetRoom: "Wall",
  },
  {
    id: "wall-gallery-charcoal-lounge",
    title: "Gallery Charcoal Lounge",
    subtitle: "Living Room / Smart Wall Paint",
    spaceType: "Living Room",
    style: "Gallery Charcoal",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/gallery-charcoal-lounge.jpg"),
    startStep: "3",
    presetStyle: "Gallery Charcoal",
    presetRoom: "Wall",
  },
  {
    id: "wall-soft-ivory-kitchen",
    title: "Soft Ivory Kitchen",
    subtitle: "Kitchen / Smart Wall Paint",
    spaceType: "Kitchen",
    style: "Soft Ivory",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/soft-ivory-kitchen.jpg"),
    startStep: "3",
    presetStyle: "Soft Ivory",
    presetRoom: "Wall",
  },
  {
    id: "wall-deep-olive-study",
    title: "Deep Olive Study",
    subtitle: "Study / Smart Wall Paint",
    spaceType: "Study",
    style: "Olive Grove",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/deep-olive-study.jpg"),
    startStep: "3",
    presetStyle: "Olive Grove",
    presetRoom: "Wall",
  },
  {
    id: "wall-lavender-mist-bath",
    title: "Lavender Mist Bath",
    subtitle: "Bathroom / Smart Wall Paint",
    spaceType: "Bathroom",
    style: "Lavender Mist",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/lavender-mist-bath.jpg"),
    startStep: "3",
    presetStyle: "Lavender Mist",
    presetRoom: "Wall",
  },
  {
    id: "wall-pearl-gray-salon",
    title: "Pearl Gray Salon",
    subtitle: "Living Room / Smart Wall Paint",
    spaceType: "Living Room",
    style: "Pearl Gray",
    service: "paint",
    image: require("../assets/media/discover/wall-scenes/pearl-gray-salon.jpg"),
    startStep: "3",
    presetStyle: "Pearl Gray",
    presetRoom: "Wall",
  },
];

const FLOOR_ITEMS: DiscoverTile[] = [
  {
    id: "floor-natural-oak-parquet",
    title: "Natural Oak Parquet",
    subtitle: "Living Room / Floor Restyle",
    spaceType: "Living Room",
    style: "Natural Oak",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/natural-oak-parquet.jpg"),
    startStep: "3",
    presetStyle: "Natural Oak",
    presetRoom: "Floor",
  },
  {
    id: "floor-heritage-walnut-plank",
    title: "Heritage Walnut Plank",
    subtitle: "Dining Room / Floor Restyle",
    spaceType: "Dining Room",
    style: "Walnut Wood",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/heritage-walnut-plank.jpg"),
    startStep: "3",
    presetStyle: "Walnut Wood",
    presetRoom: "Floor",
  },
  {
    id: "floor-polished-carrara-marble",
    title: "Polished Carrara Marble",
    subtitle: "Bathroom / Floor Restyle",
    spaceType: "Bathroom",
    style: "Carrara Marble",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/polished-carrara-marble.jpg"),
    startStep: "3",
    presetStyle: "Carrara Marble",
    presetRoom: "Floor",
  },
  {
    id: "floor-industrial-gray-concrete",
    title: "Industrial Gray Concrete",
    subtitle: "Kitchen / Floor Restyle",
    spaceType: "Kitchen",
    style: "Polished Concrete",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/industrial-gray-concrete.jpg"),
    startStep: "3",
    presetStyle: "Polished Concrete",
    presetRoom: "Floor",
  },
  {
    id: "floor-walnut-chevron",
    title: "Walnut Chevron",
    subtitle: "Living Room / Floor Restyle",
    spaceType: "Living Room",
    style: "Herringbone Oak",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/walnut-chevron.jpg"),
    startStep: "3",
    presetStyle: "Herringbone Oak",
    presetRoom: "Floor",
  },
  {
    id: "floor-terracotta-atelier-tile",
    title: "Terracotta Atelier Tile",
    subtitle: "Kitchen / Floor Restyle",
    spaceType: "Kitchen",
    style: "Terracotta Tile",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/terracotta-atelier-tile.jpg"),
    startStep: "3",
    presetStyle: "Terracotta Tile",
    presetRoom: "Floor",
  },
  {
    id: "floor-modern-slate-tile",
    title: "Modern Slate Tile",
    subtitle: "Bathroom / Floor Restyle",
    spaceType: "Bathroom",
    style: "Slate Tile",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/modern-slate-tile.jpg"),
    startStep: "3",
    presetStyle: "Slate Tile",
    presetRoom: "Floor",
  },
  {
    id: "floor-plush-ivory-carpet",
    title: "Plush Ivory Carpet",
    subtitle: "Bedroom / Floor Restyle",
    spaceType: "Bedroom",
    style: "Plush Carpet",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/plush-ivory-carpet.jpg"),
    startStep: "3",
    presetStyle: "Plush Carpet",
    presetRoom: "Floor",
  },
  {
    id: "floor-weathered-oak-studio",
    title: "Weathered Oak Studio",
    subtitle: "Home Office / Floor Restyle",
    spaceType: "Home Office",
    style: "Weathered Oak",
    service: "floor",
    image: require("../assets/media/discover/floor-scenes/weathered-oak-studio.jpg"),
    startStep: "3",
    presetStyle: "Weathered Oak",
    presetRoom: "Floor",
  },
];

const GARDEN_ITEMS: DiscoverTile[] = [
  {
    id: "garden-backyard",
    title: "Backyard Retreat",
    subtitle: "Backyard / Mediterranean",
    spaceType: "Backyard",
    style: "Mediterranean",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-backyard.jpg"),
  },
  {
    id: "garden-fireside-patio",
    title: "Fireside Patio",
    subtitle: "Patio / Rustic",
    spaceType: "Patio",
    style: "Rustic",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-fireside-patio.jpg"),
  },
  {
    id: "garden-terrace",
    title: "Sunset Terrace",
    subtitle: "Terrace / Luxury",
    spaceType: "Terrace",
    style: "Luxury",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-terrace.jpg"),
  },
  {
    id: "garden-infinity-pool",
    title: "Infinity Pool",
    subtitle: "Swimming Pool / Coastal",
    spaceType: "Swimming Pool",
    style: "Coastal",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-infinity-pool.jpg"),
  },
  {
    id: "garden-front-yard",
    title: "Arrival Garden",
    subtitle: "Front Yard / Modern",
    spaceType: "Front Yard",
    style: "Modern",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-front-yard.jpg"),
  },
  {
    id: "garden-deck",
    title: "Forest Deck",
    subtitle: "Deck / Japandi",
    spaceType: "Deck",
    style: "Japandi",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-deck.jpg"),
  },
  {
    id: "garden-patio",
    title: "Garden Patio",
    subtitle: "Patio / Tropical",
    spaceType: "Patio",
    style: "Tropical",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-patio.jpg"),
  },
  {
    id: "garden-swimming-pool",
    title: "Pool Escape",
    subtitle: "Swimming Pool / Coastal",
    spaceType: "Swimming Pool",
    style: "Coastal",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-swimming-pool.jpg"),
  },
  {
    id: "garden-spa-deck",
    title: "Spa Deck",
    subtitle: "Deck / Luxury",
    spaceType: "Deck",
    style: "Luxury",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-spa-deck.jpg"),
  },
  {
    id: "garden-pool-courtyard",
    title: "Pool Courtyard",
    subtitle: "Pool Courtyard / Mediterranean",
    spaceType: "Pool Courtyard",
    style: "Mediterranean",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-pool-courtyard.jpg"),
  },
  {
    id: "garden-sunset-lounge",
    title: "Golden Lounge",
    subtitle: "Sunset Lounge / Modern",
    spaceType: "Sunset Lounge",
    style: "Modern",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-sunset-lounge.jpg"),
  },
  {
    id: "garden-villa-entry",
    title: "Villa Entry",
    subtitle: "Villa Entry / Mediterranean",
    spaceType: "Villa Entry",
    style: "Mediterranean",
    service: "garden",
    image: require("../assets/media/discover/garden/garden-villa-entry.jpg"),
  },
];

const EXTERIOR_ITEMS: DiscoverTile[] = [
  {
    id: "exterior-modern-villa",
    title: "Modern House",
    subtitle: "Modern House / Modern",
    spaceType: "Modern House",
    style: "Modern",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-modern-villa.jpg"),
  },
  {
    id: "exterior-pool-house",
    title: "Luxury Villa",
    subtitle: "Luxury Villa / Luxury",
    spaceType: "Luxury Villa",
    style: "Luxury",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-pool-house.jpg"),
  },
  {
    id: "exterior-retail-store",
    title: "Retail Frontage",
    subtitle: "Retail Store / Brutalist",
    spaceType: "Retail Store",
    style: "Brutalist",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-retail-store.jpg"),
  },
  {
    id: "exterior-apartment-block",
    title: "Urban Apartments",
    subtitle: "Apartment Block / Modern",
    spaceType: "Apartment Block",
    style: "Modern",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-apartment-block.jpg"),
  },
  {
    id: "exterior-glass-office",
    title: "Glass Office",
    subtitle: "Office Building / Minimalist",
    spaceType: "Office Building",
    style: "Minimalist",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-glass-office.jpg"),
  },
  {
    id: "exterior-stone-manor",
    title: "Stone Manor",
    subtitle: "Luxury Villa / Mediterranean",
    spaceType: "Luxury Villa",
    style: "Mediterranean",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-stone-manor.jpg"),
  },
  {
    id: "exterior-garage-suite",
    title: "Garage Studio",
    subtitle: "Garage / Minimalist",
    spaceType: "Garage",
    style: "Minimalist",
    service: "exterior",
    image: require("../assets/media/discover/exterior/exterior-garage-suite.jpg"),
  },
];

export const DISCOVER_SECTIONS: DiscoverSection[] = [
  {
    id: "home",
    title: "Home",
    description: "Designer-led rooms across living, sleep, dining, work, and entertainment.",
    items: HOME_ITEMS,
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
  {
    id: "garden",
    title: "Garden",
    description: "Outdoor lounges, terraces, pools, decks, and resort-minded garden scenes.",
    items: GARDEN_ITEMS,
  },
  {
    id: "exterior",
    title: "Exterior",
    description: "Facade inspiration from modern villas, urban blocks, offices, and retail shells.",
    items: EXTERIOR_ITEMS,
  },
];
