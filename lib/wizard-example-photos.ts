export type WizardExamplePhoto = {
  id: string;
  label: string;
  source: number;
};

export const FLOOR_WIZARD_EXAMPLE_PHOTOS: WizardExamplePhoto[] = [
  {
    id: "floor-natural-oak",
    label: "Natural Oak",
    source: require("../assets/media/discover/floor-scenes/natural-oak-parquet.jpg"),
  },
  {
    id: "floor-heritage-walnut",
    label: "Heritage Walnut",
    source: require("../assets/media/discover/floor-scenes/heritage-walnut-plank.jpg"),
  },
  {
    id: "floor-carrara-marble",
    label: "Carrara Marble",
    source: require("../assets/media/discover/floor-scenes/polished-carrara-marble.jpg"),
  },
  {
    id: "floor-industrial-concrete",
    label: "Industrial Concrete",
    source: require("../assets/media/discover/floor-scenes/industrial-gray-concrete.jpg"),
  },
];

export const PAINT_WIZARD_EXAMPLE_PHOTOS: WizardExamplePhoto[] = [
  {
    id: "paint-sage-green",
    label: "Sage Green",
    source: require("../assets/media/discover/wall-scenes/sage-green-suite.jpg"),
  },
  {
    id: "paint-midnight-navy",
    label: "Midnight Navy",
    source: require("../assets/media/discover/wall-scenes/midnight-navy-bedroom.jpg"),
  },
  {
    id: "paint-terracotta",
    label: "Terracotta Glow",
    source: require("../assets/media/discover/wall-scenes/terracotta-dining.jpg"),
  },
  {
    id: "paint-dusty-rose",
    label: "Dusty Rose",
    source: require("../assets/media/discover/wall-scenes/dusty-rose-retreat.jpg"),
  },
];
