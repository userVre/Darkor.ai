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
  makeImage("floor-herringbone", "Heritage Herringbone", require("../assets/media/discover/injected/floor/scene-1.webp")),
  makeImage("floor-carrara", "Carrara Marble", require("../assets/media/discover/injected/floor/scene-2.webp")),
  makeImage("floor-concrete", "Satin Concrete", require("../assets/media/discover/injected/floor/scene-3.webp")),
  makeImage("floor-walnut", "Walnut Gloss", require("../assets/media/discover/injected/floor/scene-4.webp")),
  makeImage("floor-limestone", "Limestone Slab", require("../assets/media/discover/injected/floor/scene-5.webp")),
];

export const WALL_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("wall-sage", "Sage Plaster", require("../assets/media/discover/injected/wall/scene-1.webp")),
  makeImage("wall-slats", "Linear Slats", require("../assets/media/discover/injected/wall/scene-2.webp")),
  makeImage("wall-marble", "Veined Marble", require("../assets/media/discover/injected/wall/scene-3.webp")),
  makeImage("wall-concrete", "Minimal Concrete", require("../assets/media/discover/injected/wall/scene-4.webp")),
  makeImage("wall-botanical", "Botanical Mural", require("../assets/media/discover/injected/wall/scene-5.webp")),
];

export const HOME_CORE_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("home-kitchen", "Kitchen", require("../assets/media/discover/home/home-kitchen.webp")),
  makeImage("home-living-room", "Living Room", require("../assets/media/discover/home/home-living-room.webp")),
  makeImage("home-bedroom", "Bedroom", require("../assets/media/discover/home/home-master-suite.webp")),
  makeImage("home-bathroom", "Bathroom", require("../assets/media/discover/home/home-bathroom.webp")),
  makeImage("home-dining-room", "Dining Room", require("../assets/media/discover/home/home-dining-room.webp")),
  makeImage("home-gaming-room", "Gaming Room", require("../assets/media/discover/home/home-gaming-room.webp")),
  makeImage("home-office", "Home Office", require("../assets/media/discover/home/home-home-office.webp")),
];

export const HOME_FLEX_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("home-coffee-shop", "Coffee Shop", require("../assets/media/styles/style-modern.webp")),
  makeImage("home-gaming-loft", "Gaming Studio", require("../assets/media/discover/home/home-gaming-room.webp")),
  makeImage("home-attic-lounge", "Attic Lounge", require("../assets/media/discover/home/home-library.webp")),
  makeImage("home-study-studio", "Study Room", require("../assets/media/discover/home/home-study.webp")),
  makeImage("home-service-room", "Service Room", require("../assets/media/discover/home/home-bathroom.webp")),
  makeImage("home-laundry-room", "Laundry Room", require("../assets/media/discover/home/home-laundry.webp")),
];

export const LIVING_ROOM_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("living-serene", "Serene Lounge", require("../assets/media/styles/style-scandinavian.webp")),
  makeImage("living-moody", "Moody Lounge", require("../assets/media/styles/style-cyberpunk.webp")),
  makeImage("living-organic", "Organic Living", require("../assets/media/styles/style-bohemian.webp")),
  makeImage("living-grand", "Grand Salon", require("../assets/media/styles/style-luxury.webp")),
  makeImage("living-playful", "Playful Lounge", require("../assets/media/styles/style-art-deco.webp")),
];

export const HOME_LUXE_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("home-restaurant", "Restaurant", require("../assets/media/styles/style-glam.webp")),
  makeImage("home-study-library", "Study Library", require("../assets/media/discover/home/home-library.webp")),
  makeImage("home-attic-retreat", "Attic Retreat", require("../assets/media/discover/home/home-study.webp")),
  makeImage("home-toilet-suite", "Toilet Suite", require("../assets/media/discover/home/home-bathroom.webp")),
  makeImage("home-balcony", "Balcony", require("../assets/media/discover/garden/garden-terrace.webp")),
  makeImage("home-hall", "Hall", require("../assets/media/discover/home/home-hall.webp")),
  makeImage("home-deck-day", "Deck Day", require("../assets/media/discover/garden/garden-deck.webp")),
  makeImage("home-deck-night", "Deck Night", require("../assets/media/styles/style-hollywood-regency.webp")),
];

export const EXTERIOR_PRIMARY_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("exterior-house-day", "House", require("../assets/media/discover/exterior/exterior-modern-villa.webp")),
  makeImage("exterior-residential-night", "Residential", require("../assets/media/discover/exterior/exterior-apartment-block.webp")),
  makeImage("exterior-villa-stone", "Villa", require("../assets/media/discover/exterior/exterior-stone-manor.webp")),
  makeImage("exterior-glass-corner", "Glass Corner", require("../assets/media/discover/exterior/exterior-glass-office.webp")),
  makeImage("exterior-eco-apartments", "Apartment", require("../assets/media/discover/exterior/exterior-apartment-block.webp")),
];

export const EXTERIOR_SECONDARY_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("exterior-apartment-tower", "Apartment Tower", require("../assets/media/discover/exterior/exterior-apartment-block.webp")),
  makeImage("exterior-retail-pavilion", "Retail Pavilion", require("../assets/media/discover/exterior/exterior-retail-storefront.webp")),
  makeImage("exterior-office-campus", "Office Building", require("../assets/media/discover/exterior/exterior-glass-office.webp")),
  makeImage("exterior-modern-villa", "Modern Villa", require("../assets/media/discover/exterior/exterior-modern-villa.webp")),
  makeImage("exterior-residential-tower", "Residential Tower", require("../assets/media/discover/exterior/exterior-pool-house.webp")),
];

export const GARDEN_PRIMARY_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("garden-infinity-pool", "Infinity Pool", require("../assets/media/discover/garden/garden-swimming-pool.webp")),
  makeImage("garden-waterfall-court", "Waterfall Court", require("../assets/media/discover/garden/garden-pool-courtyard.webp")),
  makeImage("garden-sunset-fire-pit", "Sunset Fire Pit", require("../assets/media/discover/garden/garden-fireside-patio.webp")),
  makeImage("garden-tropical-lounge", "Tropical Lounge", require("../assets/media/discover/garden/garden-patio.webp")),
  makeImage("garden-living-wall", "Living Wall", require("../assets/media/discover/garden/garden-backyard.webp")),
  makeImage("garden-light-court", "Light Court", require("../assets/media/discover/garden/garden-villa-entry.webp")),
];

export const GARDEN_SECONDARY_AFTER_SCENES: InjectedGalleryImage[] = [
  makeImage("garden-sunset-pool", "Sunset Pool", require("../assets/media/discover/garden/garden-swimming-pool.webp")),
  makeImage("garden-fire-cove", "Fire Cove", require("../assets/media/discover/garden/garden-fireside-patio.webp")),
  makeImage("garden-pool-court", "Pool Court", require("../assets/media/discover/garden/garden-pool-courtyard.webp")),
  makeImage("garden-waterfall-lounge", "Waterfall Lounge", require("../assets/media/discover/garden/garden-patio.webp")),
  makeImage("garden-resort-deck", "Resort Deck", require("../assets/media/discover/garden/garden-deck.webp")),
  makeImage("garden-lagoon-falls", "Lagoon Falls", require("../assets/media/discover/garden/garden-villa-entry.webp")),
];

export const INTERIOR_WIZARD_EXAMPLE_PHOTOS: WizardExamplePhoto[] = [
  // FIXED: before/after order corrected
  makePhoto("interior-empty-room", "Empty Room", require("../assets/media/examples/interior/interior-before-empty-room.webp")),
  makePhoto("interior-messy-lounge", "Living Room", require("../assets/media/examples/interior/interior-before-messy-lounge.webp")),
  makePhoto("interior-worn-reading-room", "Bedroom", require("../assets/media/examples/interior/interior-before-worn-reading-room.webp")),
  makePhoto("interior-empty-kitchen", "Kitchen", require("../assets/media/examples/interior/interior-before-empty-kitchen.webp")),
  makePhoto("interior-damaged-room", "Bathroom", require("../assets/media/examples/interior/interior-before-damaged-room.webp")),
  makePhoto("interior-outdated-kitchen", "Home Office", require("../assets/media/examples/interior/interior-before-outdated-kitchen.webp")),
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
