export type WizardExamplePhoto = {
  id: string;
  label: string;
  source: number;
};

export type InjectedGalleryImage = {
  id: string;
  label: string;
  source: number;
};

export type ExteriorBuildingTypeCard = {
  id: string;
  title: string;
  image: number;
};

function makeImage(id: string, label: string, source: number): InjectedGalleryImage {
  return { id, label, source };
}

function makePhoto(id: string, label: string, source: number): WizardExamplePhoto {
  return { id, label, source };
}

export const FLOOR_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("floor-herringbone", "Heritage Herringbone", require("../assets/media/discover/injected/floor/scene-1.png")),
  makeImage("floor-carrara", "Carrara Marble", require("../assets/media/discover/injected/floor/scene-2.png")),
  makeImage("floor-concrete", "Satin Concrete", require("../assets/media/discover/injected/floor/scene-3.png")),
  makeImage("floor-walnut", "Walnut Gloss", require("../assets/media/discover/injected/floor/scene-4.png")),
  makeImage("floor-limestone", "Limestone Slab", require("../assets/media/discover/injected/floor/scene-5.png")),
];

export const WALL_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("wall-sage", "Sage Plaster", require("../assets/media/discover/injected/wall/scene-1.png")),
  makeImage("wall-slats", "Linear Slats", require("../assets/media/discover/injected/wall/scene-2.png")),
  makeImage("wall-marble", "Veined Marble", require("../assets/media/discover/injected/wall/scene-3.png")),
  makeImage("wall-concrete", "Minimal Concrete", require("../assets/media/discover/injected/wall/scene-4.png")),
  makeImage("wall-botanical", "Botanical Mural", require("../assets/media/discover/injected/wall/scene-5.png")),
];

export const HOME_CORE_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("home-kitchen", "Kitchen", require("../assets/media/discover/injected/home-core/scene-1.png")),
  makeImage("home-living-room", "Living Room", require("../assets/media/discover/injected/home-core/scene-2.png")),
  makeImage("home-bedroom", "Bedroom", require("../assets/media/discover/injected/home-core/scene-3.png")),
  makeImage("home-bathroom", "Bathroom", require("../assets/media/discover/injected/home-core/scene-4.png")),
  makeImage("home-dining-room", "Dining Room", require("../assets/media/discover/injected/home-core/scene-5.png")),
  makeImage("home-gaming-room", "Gaming Room", require("../assets/media/discover/injected/home-core/scene-6.png")),
  makeImage("home-office", "Home Office", require("../assets/media/discover/injected/home-core/scene-7.png")),
];

export const HOME_FLEX_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("home-coffee-shop", "Coffee Shop", require("../assets/media/discover/injected/home-flex/scene-1.png")),
  makeImage("home-gaming-loft", "Gaming Studio", require("../assets/media/discover/injected/home-flex/scene-2.png")),
  makeImage("home-attic-lounge", "Attic Lounge", require("../assets/media/discover/injected/home-flex/scene-3.png")),
  makeImage("home-study-studio", "Study Room", require("../assets/media/discover/injected/home-flex/scene-4.png")),
  makeImage("home-service-room", "Service Room", require("../assets/media/discover/injected/home-flex/scene-5.png")),
  makeImage("home-laundry-room", "Laundry Room", require("../assets/media/discover/injected/home-flex/scene-6.png")),
];

export const LIVING_ROOM_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("living-serene", "Serene Lounge", require("../assets/media/discover/injected/living-room/scene-1.png")),
  makeImage("living-moody", "Moody Lounge", require("../assets/media/discover/injected/living-room/scene-2.png")),
  makeImage("living-organic", "Organic Living", require("../assets/media/discover/injected/living-room/scene-3.png")),
  makeImage("living-grand", "Grand Salon", require("../assets/media/discover/injected/living-room/scene-4.png")),
  makeImage("living-playful", "Playful Lounge", require("../assets/media/discover/injected/living-room/scene-5.png")),
];

export const HOME_LUXE_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("home-restaurant", "Restaurant", require("../assets/media/discover/injected/home-luxe/scene-1.png")),
  makeImage("home-study-library", "Study Library", require("../assets/media/discover/injected/home-luxe/scene-2.png")),
  makeImage("home-attic-retreat", "Attic Retreat", require("../assets/media/discover/injected/home-luxe/scene-3.png")),
  makeImage("home-toilet-suite", "Toilet Suite", require("../assets/media/discover/injected/home-luxe/scene-4.png")),
  makeImage("home-balcony", "Balcony", require("../assets/media/discover/injected/home-luxe/scene-5.png")),
  makeImage("home-hall", "Hall", require("../assets/media/discover/injected/home-luxe/scene-6.png")),
  makeImage("home-deck-day", "Deck Day", require("../assets/media/discover/injected/home-luxe/scene-7.png")),
  makeImage("home-deck-night", "Deck Night", require("../assets/media/discover/injected/home-luxe/scene-8.png")),
];

export const EXTERIOR_PRIMARY_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("exterior-house-day", "House", require("../assets/media/discover/injected/exterior-primary/scene-1.png")),
  makeImage("exterior-residential-night", "Residential", require("../assets/media/discover/injected/exterior-primary/scene-2.png")),
  makeImage("exterior-villa-stone", "Villa", require("../assets/media/discover/injected/exterior-primary/scene-3.png")),
  makeImage("exterior-glass-corner", "Glass Corner", require("../assets/media/discover/injected/exterior-primary/scene-4.png")),
  makeImage("exterior-eco-apartments", "Apartment", require("../assets/media/discover/injected/exterior-primary/scene-5.png")),
];

export const EXTERIOR_SECONDARY_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("exterior-apartment-tower", "Apartment Tower", require("../assets/media/discover/injected/exterior-secondary/scene-1.png")),
  makeImage("exterior-retail-pavilion", "Retail Pavilion", require("../assets/media/discover/injected/exterior-secondary/scene-2.png")),
  makeImage("exterior-office-campus", "Office Building", require("../assets/media/discover/injected/exterior-secondary/scene-3.png")),
  makeImage("exterior-modern-villa", "Modern Villa", require("../assets/media/discover/injected/exterior-secondary/scene-4.png")),
  makeImage("exterior-residential-tower", "Residential Tower", require("../assets/media/discover/injected/exterior-secondary/scene-5.png")),
];

export const GARDEN_PRIMARY_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("garden-infinity-pool", "Infinity Pool", require("../assets/media/discover/injected/garden-primary/scene-1.png")),
  makeImage("garden-waterfall-court", "Waterfall Court", require("../assets/media/discover/injected/garden-primary/scene-2.png")),
  makeImage("garden-sunset-fire-pit", "Sunset Fire Pit", require("../assets/media/discover/injected/garden-primary/scene-3.png")),
  makeImage("garden-tropical-lounge", "Tropical Lounge", require("../assets/media/discover/injected/garden-primary/scene-4.png")),
  makeImage("garden-living-wall", "Living Wall", require("../assets/media/discover/injected/garden-primary/scene-5.png")),
  makeImage("garden-light-court", "Light Court", require("../assets/media/discover/injected/garden-primary/scene-6.png")),
];

export const GARDEN_SECONDARY_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("garden-sunset-pool", "Sunset Pool", require("../assets/media/discover/injected/garden-secondary/scene-1.png")),
  makeImage("garden-fire-cove", "Fire Cove", require("../assets/media/discover/injected/garden-secondary/scene-2.png")),
  makeImage("garden-pool-court", "Pool Court", require("../assets/media/discover/injected/garden-secondary/scene-3.png")),
  makeImage("garden-waterfall-lounge", "Waterfall Lounge", require("../assets/media/discover/injected/garden-secondary/scene-4.png")),
  makeImage("garden-resort-deck", "Resort Deck", require("../assets/media/discover/injected/garden-secondary/scene-5.png")),
  makeImage("garden-lagoon-falls", "Lagoon Falls", require("../assets/media/discover/injected/garden-secondary/scene-6.png")),
];

export const INTERIOR_WIZARD_EXAMPLE_PHOTOS: WizardExamplePhoto[] = [
  // FIXED: before/after order corrected
  makePhoto("interior-empty-room", "Empty Room", require("../assets/media/examples/interior/interior-before-empty-room.jpg")),
  makePhoto("interior-messy-lounge", "Living Room", require("../assets/media/examples/interior/interior-before-messy-lounge.jpg")),
  makePhoto("interior-worn-reading-room", "Bedroom", require("../assets/media/examples/interior/interior-before-worn-reading-room.jpg")),
  makePhoto("interior-empty-kitchen", "Kitchen", require("../assets/media/examples/interior/interior-before-empty-kitchen.jpg")),
  makePhoto("interior-damaged-room", "Bathroom", require("../assets/media/examples/interior/interior-before-damaged-room.jpg")),
  makePhoto("interior-outdated-kitchen", "Home Office", require("../assets/media/examples/interior/interior-before-outdated-kitchen.jpg")),
];

export const EXTERIOR_WIZARD_EXAMPLE_PHOTOS: WizardExamplePhoto[] = [
  makePhoto("exterior-apartment", "Apartment", EXTERIOR_SECONDARY_AFTER_SCENES[0].source),
  makePhoto("exterior-house", "House", EXTERIOR_PRIMARY_AFTER_SCENES[0].source),
  makePhoto("exterior-office-building", "Office", EXTERIOR_SECONDARY_AFTER_SCENES[2].source),
  makePhoto("exterior-villa", "Villa", EXTERIOR_SECONDARY_AFTER_SCENES[3].source),
  makePhoto("exterior-residential", "Residential", EXTERIOR_PRIMARY_AFTER_SCENES[1].source),
  makePhoto("exterior-retail", "Retail", EXTERIOR_SECONDARY_AFTER_SCENES[1].source),
];

export const GARDEN_WIZARD_EXAMPLE_PHOTOS: WizardExamplePhoto[] = [
  makePhoto("garden-infinity-pool", "Infinity Pool", GARDEN_PRIMARY_AFTER_SCENES[0].source),
  makePhoto("garden-waterfall-court", "Waterfall Court", GARDEN_PRIMARY_AFTER_SCENES[1].source),
  makePhoto("garden-fire-pit", "Fire Pit", GARDEN_PRIMARY_AFTER_SCENES[2].source),
  makePhoto("garden-tropical-lounge", "Tropical Lounge", GARDEN_PRIMARY_AFTER_SCENES[3].source),
  makePhoto("garden-resort-deck", "Resort Deck", GARDEN_SECONDARY_AFTER_SCENES[4].source),
  makePhoto("garden-lagoon-falls", "Lagoon Falls", GARDEN_SECONDARY_AFTER_SCENES[5].source),
];

export const FLOOR_WIZARD_EXAMPLE_PHOTOS: WizardExamplePhoto[] = FLOOR_AFTER_SCENES.map((scene) =>
  makePhoto(scene.id, scene.label, scene.source),
);

export const PAINT_WIZARD_EXAMPLE_PHOTOS: WizardExamplePhoto[] = WALL_AFTER_SCENES.map((scene) =>
  makePhoto(scene.id, scene.label, scene.source),
);

export const EXTERIOR_BUILDING_TYPE_CARDS: ExteriorBuildingTypeCard[] = [
  {
    id: "apartment",
    title: "Apartment",
    image: EXTERIOR_SECONDARY_AFTER_SCENES[0].source,
  },
  {
    id: "house",
    title: "House",
    image: EXTERIOR_PRIMARY_AFTER_SCENES[0].source,
  },
  {
    id: "office-building",
    title: "Office Building",
    image: EXTERIOR_SECONDARY_AFTER_SCENES[2].source,
  },
  {
    id: "villa",
    title: "Villa",
    image: EXTERIOR_SECONDARY_AFTER_SCENES[3].source,
  },
  {
    id: "residential",
    title: "Residential",
    image: EXTERIOR_PRIMARY_AFTER_SCENES[1].source,
  },
  {
    id: "retail",
    title: "Retail",
    image: EXTERIOR_SECONDARY_AFTER_SCENES[1].source,
  },
];
