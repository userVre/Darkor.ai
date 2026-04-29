import {palette} from "@/styles/theme";
import type {ImageSourcePropType} from "react-native";

export type WallColorOption = {
  id: string;
  title: string;
  value: string;
  description: string;
  image: ImageSourcePropType;
  discoverSubtitle: string;
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
