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
    title: "Vert sauge",
    value: palette.sageGreen,
    description: "Vert doux et calme pour des espaces lumineux et raffinés.",
    image: require("../assets/media/discover/wall-scenes/sage-green-suite.webp"),
    discoverSubtitle: "Mur / Calme botanique",
  },
  {
    id: "midnight-navy",
    title: "Bleu nuit",
    value: palette.midnightNavy,
    description: "Profondeur bleu marine avec contraste architectural net.",
    image: require("../assets/media/discover/wall-scenes/midnight-navy-bedroom.webp"),
    discoverSubtitle: "Mur / Contraste soigné",
  },
  {
    id: "terracotta-glow",
    title: "Terre cuite",
    value: palette.terracottaGlow,
    description: "Teinte argile chaleureuse avec une énergie éditoriale.",
    image: require("../assets/media/discover/wall-scenes/terracotta-dining.webp"),
    discoverSubtitle: "Mur / Argile chaude",
  },
  {
    id: "dusty-rose",
    title: "Rose poudré",
    value: palette.dustyRose,
    description: "Rose doux et feutré avec une élégance boutique.",
    image: require("../assets/media/discover/wall-scenes/dusty-rose-retreat.webp"),
    discoverSubtitle: "Mur / Rose boutique",
  },
  {
    id: "gallery-charcoal",
    title: "Charbon galerie",
    value: palette.galleryCharcoal,
    description: "Charbon raffiné pour des pièces profondes et artistiques.",
    image: require("../assets/media/discover/wall-scenes/gallery-charcoal-lounge.webp"),
    discoverSubtitle: "Mur / Galerie feutrée",
  },
  {
    id: "soft-ivory",
    title: "Ivoire doux",
    value: palette.softIvory,
    description: "Neutre lumineux qui garde la pièce claire et vivante.",
    image: require("../assets/media/discover/wall-scenes/soft-ivory-kitchen.webp"),
    discoverSubtitle: "Mur / Neutre lumineux",
  },
  {
    id: "olive-grove",
    title: "Olive profonde",
    value: palette.oliveGrove,
    description: "Olive terreuse avec une ambiance design bien ancrée.",
    image: require("../assets/media/discover/wall-scenes/deep-olive-study.webp"),
    discoverSubtitle: "Mur / Profondeur naturelle",
  },
  {
    id: "lavender-mist",
    title: "Brume lavande",
    value: palette.lavenderMist,
    description: "Voile violet doux pour des pièces pastel élégantes.",
    image: require("../assets/media/discover/wall-scenes/lavender-mist-bath.webp"),
    discoverSubtitle: "Mur / Pastel doux",
  },
  {
    id: "pearl-gray",
    title: "Gris perle",
    value: palette.pearlGray,
    description: "Gris clair et souple pour un rendu quotidien soigné.",
    image: require("../assets/media/discover/wall-scenes/pearl-gray-salon.webp"),
    discoverSubtitle: "Mur / Neutre moderne",
  },
];

export const FLOOR_MATERIAL_OPTIONS: FloorMaterialOption[] = [
  {
    id: "natural-oak",
    title: "Chêne naturel",
    description: "Planches de chêne aérées au grain naturel doux.",
    promptLabel: "light natural oak flooring with wide-plank grain detail",
    image: require("../assets/media/discover/floor-scenes/natural-oak-parquet.webp"),
    discoverSubtitle: "Sol / Bois clair",
  },
  {
    id: "walnut-wood",
    title: "Bois de noyer",
    description: "Planches de noyer profondes avec un contraste chaleureux.",
    promptLabel: "luxury walnut wood flooring with rich deep grain",
    image: require("../assets/media/discover/floor-scenes/heritage-walnut-plank.webp"),
    discoverSubtitle: "Sol / Bois foncé",
  },
  {
    id: "carrara-marble",
    title: "Marbre de Carrare",
    description: "Veinage clair avec une finition luxe et apaisée.",
    promptLabel: "carrara marble flooring with elegant soft veining",
    image: require("../assets/media/discover/floor-scenes/polished-carrara-marble.webp"),
    discoverSubtitle: "Sol / Pierre polie",
  },
  {
    id: "polished-concrete",
    title: "Béton poli",
    description: "Béton lisse et satiné avec une ambiance galerie urbaine.",
    promptLabel: "polished concrete flooring with premium smooth texture",
    image: require("../assets/media/discover/floor-scenes/industrial-gray-concrete.webp"),
    discoverSubtitle: "Sol / Industriel minimal",
  },
  {
    id: "herringbone-oak",
    title: "Chêne à chevrons",
    description: "Motif chêne classique avec un mouvement chaleureux.",
    promptLabel: "herringbone oak parquet flooring with premium pattern definition",
    image: require("../assets/media/discover/floor-scenes/walnut-chevron.webp"),
    discoverSubtitle: "Sol / Bois à motif",
  },
  {
    id: "terracotta-tile",
    title: "Tuile en terre cuite",
    description: "Chaleur argileuse avec un caractère artisanal.",
    promptLabel: "terracotta tile flooring with warm clay color variation",
    image: require("../assets/media/discover/floor-scenes/terracotta-atelier-tile.webp"),
    discoverSubtitle: "Sol / Terre méditerranéenne",
  },
  {
    id: "slate-tile",
    title: "Tuile d'ardoise",
    description: "Ardoise foncée avec une finition grand format nette.",
    promptLabel: "dark slate tile flooring with large format stone slabs",
    image: require("../assets/media/discover/floor-scenes/modern-slate-tile.webp"),
    discoverSubtitle: "Sol / Pierre foncée",
  },
  {
    id: "plush-carpet",
    title: "Tapis doux",
    description: "Tapis crème très doux pour une ambiance calme et confortable.",
    promptLabel: "luxury plush carpet flooring in a soft cream tone",
    image: require("../assets/media/discover/floor-scenes/plush-ivory-carpet.webp"),
    discoverSubtitle: "Sol / Texture douce",
  },
  {
    id: "weathered-oak",
    title: "Chêne patiné",
    description: "Chêne moyen avec une finition légèrement vieillie.",
    promptLabel: "weathered oak flooring with subtle aged grain",
    image: require("../assets/media/discover/floor-scenes/weathered-oak-studio.webp"),
    discoverSubtitle: "Sol / Chaleur rustique",
  },
];
