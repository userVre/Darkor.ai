import type { ImageSourcePropType } from "react-native";

export type DiscoverTabId = "home" | "garden" | "exterior" | "wall" | "floor";
export type DiscoverService = "interior" | "garden" | "exterior" | "floor" | "paint";

export type DiscoverTile = {
  id: string;
  title: string;
  image: ImageSourcePropType;
  service: DiscoverService;
};

export type DiscoverGroup = {
  id: string;
  title: string;
  items: DiscoverTile[];
};

export const DISCOVER_TABS = [
  { id: "home", label: "Home (Interior)" },
  { id: "garden", label: "Garden" },
  { id: "exterior", label: "Exterior Design" },
  { id: "wall", label: "Wall" },
  { id: "floor", label: "Floor" },
] as const satisfies ReadonlyArray<{ id: DiscoverTabId; label: string }>;

const images = {
  homeBathroom: require("../assets/media/discover/home/home-bathroom.jpg"),
  homeDiningRoom: require("../assets/media/discover/home/home-dining-room.jpg"),
  homeGamingRoom: require("../assets/media/discover/home/home-gaming-room.jpg"),
  homeHall: require("../assets/media/discover/home/home-hall.jpg"),
  homeOffice: require("../assets/media/discover/home/home-home-office.jpg"),
  homeTheater: require("../assets/media/discover/home/home-home-theater.jpg"),
  homeKitchen: require("../assets/media/discover/home/home-kitchen.jpg"),
  homeLibrary: require("../assets/media/discover/home/home-library.jpg"),
  homeLivingRoom: require("../assets/media/discover/home/home-living-room.jpg"),
  homeMasterSuite: require("../assets/media/discover/home/home-master-suite.jpg"),
  homeStudy: require("../assets/media/discover/home/home-study.jpg"),
  loungeEditorial: require("../assets/media/discover/home/interior-after-editorial-lounge.jpg"),
  loungeGrandSalon: require("../assets/media/discover/home/interior-after-grand-salon.jpg"),
  loungeMoodyClub: require("../assets/media/discover/home/interior-after-moody-club.jpg"),
  loungeOrganic: require("../assets/media/discover/home/interior-after-organic-living.jpg"),
  loungeSerene: require("../assets/media/discover/home/interior-after-serene-lounge.jpg"),
  exteriorApartments: require("../assets/media/discover/exterior/exterior-after-eco-apartments.jpg"),
  exteriorGlassOfficeAfter: require("../assets/media/discover/exterior/exterior-after-glass-office.jpg"),
  exteriorModernHouseDay: require("../assets/media/discover/exterior/exterior-after-modern-house-day.jpg"),
  exteriorModernHouseNight: require("../assets/media/discover/exterior/exterior-after-modern-house-night.jpg"),
  exteriorStoneVilla: require("../assets/media/discover/exterior/exterior-after-stone-villa.jpg"),
  exteriorApartmentBlock: require("../assets/media/discover/exterior/exterior-apartment-block.jpg"),
  exteriorGlassOffice: require("../assets/media/discover/exterior/exterior-glass-office.jpg"),
  exteriorModernVilla: require("../assets/media/discover/exterior/exterior-modern-villa.jpg"),
  exteriorPoolHouse: require("../assets/media/discover/exterior/exterior-pool-house.jpg"),
  exteriorRetailStore: require("../assets/media/discover/exterior/exterior-retail-store.jpg"),
  exteriorRetailStorefront: require("../assets/media/discover/exterior/exterior-retail-storefront.jpg"),
  exteriorStoneManor: require("../assets/media/discover/exterior/exterior-stone-manor.jpg"),
  gardenInfinityPoolAfter: require("../assets/media/discover/garden/garden-after-infinity-pool.jpg"),
  gardenLuminousWalkAfter: require("../assets/media/discover/garden/garden-after-luminous-garden-walk.jpg"),
  gardenSunsetFirePitAfter: require("../assets/media/discover/garden/garden-after-sunset-fire-pit.jpg"),
  gardenTropicalPoolAfter: require("../assets/media/discover/garden/garden-after-tropical-pool-lounge.jpg"),
  gardenWaterfallAfter: require("../assets/media/discover/garden/garden-after-waterfall-court.jpg"),
  gardenBackyard: require("../assets/media/discover/garden/garden-backyard.jpg"),
  gardenDeck: require("../assets/media/discover/garden/garden-deck.jpg"),
  gardenFiresidePatio: require("../assets/media/discover/garden/garden-fireside-patio.jpg"),
  gardenFrontYard: require("../assets/media/discover/garden/garden-front-yard.jpg"),
  gardenInfinityPool: require("../assets/media/discover/garden/garden-infinity-pool.jpg"),
  gardenPatio: require("../assets/media/discover/garden/garden-patio.jpg"),
  gardenPoolCourtyard: require("../assets/media/discover/garden/garden-pool-courtyard.jpg"),
  gardenSpaDeck: require("../assets/media/discover/garden/garden-spa-deck.jpg"),
  gardenSunsetLounge: require("../assets/media/discover/garden/garden-sunset-lounge.jpg"),
  gardenSwimmingPool: require("../assets/media/discover/garden/garden-swimming-pool.jpg"),
  gardenTerrace: require("../assets/media/discover/garden/garden-terrace.jpg"),
  gardenVillaEntry: require("../assets/media/discover/garden/garden-villa-entry.jpg"),
  wallOliveStudy: require("../assets/media/discover/wall-scenes/deep-olive-study.jpg"),
  wallDustyRose: require("../assets/media/discover/wall-scenes/dusty-rose-retreat.jpg"),
  wallCharcoalLounge: require("../assets/media/discover/wall-scenes/gallery-charcoal-lounge.jpg"),
  wallLavenderBath: require("../assets/media/discover/wall-scenes/lavender-mist-bath.jpg"),
  wallMidnightBedroom: require("../assets/media/discover/wall-scenes/midnight-navy-bedroom.jpg"),
  wallPearlSalon: require("../assets/media/discover/wall-scenes/pearl-gray-salon.jpg"),
  wallSageSuite: require("../assets/media/discover/wall-scenes/sage-green-suite.jpg"),
  wallIvoryKitchen: require("../assets/media/discover/wall-scenes/soft-ivory-kitchen.jpg"),
  wallTerracottaDining: require("../assets/media/discover/wall-scenes/terracotta-dining.jpg"),
  wallBotanical: require("../assets/media/discover/wall-scenes/wall-after-botanical-mural.jpg"),
  wallLinear: require("../assets/media/discover/wall-scenes/wall-after-linear-slats.jpg"),
  wallConcrete: require("../assets/media/discover/wall-scenes/wall-after-minimal-concrete.jpg"),
  wallSagePlaster: require("../assets/media/discover/wall-scenes/wall-after-sage-plaster.jpg"),
  wallMarble: require("../assets/media/discover/wall-scenes/wall-after-veined-marble.jpg"),
  floorCarraraAfter: require("../assets/media/discover/floor-scenes/floor-after-carrara-marble.jpg"),
  floorHerringboneAfter: require("../assets/media/discover/floor-scenes/floor-after-heritage-herringbone.jpg"),
  floorConcreteAfter: require("../assets/media/discover/floor-scenes/floor-after-satin-concrete.jpg"),
  floorLimestoneAfter: require("../assets/media/discover/floor-scenes/floor-after-soft-limestone.jpg"),
  floorWalnutAfter: require("../assets/media/discover/floor-scenes/floor-after-walnut-gloss.jpg"),
  floorWalnutPlank: require("../assets/media/discover/floor-scenes/heritage-walnut-plank.jpg"),
  floorConcrete: require("../assets/media/discover/floor-scenes/industrial-gray-concrete.jpg"),
  floorSlate: require("../assets/media/discover/floor-scenes/modern-slate-tile.jpg"),
  floorNaturalOak: require("../assets/media/discover/floor-scenes/natural-oak-parquet.jpg"),
  floorCarpet: require("../assets/media/discover/floor-scenes/plush-ivory-carpet.jpg"),
  floorCarrara: require("../assets/media/discover/floor-scenes/polished-carrara-marble.jpg"),
  floorTerracotta: require("../assets/media/discover/floor-scenes/terracotta-atelier-tile.jpg"),
  floorChevron: require("../assets/media/discover/floor-scenes/walnut-chevron.jpg"),
  floorWeatheredOak: require("../assets/media/discover/floor-scenes/weathered-oak-studio.jpg"),
  paywallBedroom: require("../assets/media/paywall/paywall-boho-bedroom.png"),
  paywallDining: require("../assets/media/paywall/paywall-dining-room.png"),
  paywallGaming: require("../assets/media/paywall/paywall-gaming-room.png"),
  paywallGarden: require("../assets/media/paywall/paywall-garden-pool.png"),
  paywallLounge: require("../assets/media/paywall/paywall-luxury-lounge.png"),
  paywallKitchen: require("../assets/media/paywall/paywall-marble-kitchen.png"),
  paywallSoftLounge: require("../assets/media/paywall/paywall-soft-lounge.png"),
} as const;

function makeTile(
  id: string,
  title: string,
  image: ImageSourcePropType,
  service: DiscoverService,
): DiscoverTile {
  return {
    id,
    title,
    image,
    service,
  };
}

const HOME_GROUPS: DiscoverGroup[] = [
  {
    id: "kitchen",
    title: "Kitchen",
    items: [
      makeTile("kitchen-editorial-1", "Marble Kitchen", images.paywallKitchen, "interior"),
      makeTile("kitchen-editorial-2", "Soft Ivory Kitchen", images.wallIvoryKitchen, "interior"),
      makeTile("kitchen-editorial-3", "Warm Kitchen", images.homeKitchen, "interior"),
    ],
  },
  {
    id: "living-room",
    title: "Living Room",
    items: [
      makeTile("living-room-1", "Serene Lounge", images.loungeSerene, "interior"),
      makeTile("living-room-2", "Moody Club", images.loungeMoodyClub, "interior"),
      makeTile("living-room-3", "Organic Living", images.loungeOrganic, "interior"),
      makeTile("living-room-4", "Grand Salon", images.loungeGrandSalon, "interior"),
      makeTile("living-room-5", "Gallery Lounge", images.homeLivingRoom, "interior"),
      makeTile("living-room-6", "Luxury Lounge", images.paywallLounge, "interior"),
      makeTile("living-room-7", "Soft Lounge", images.paywallSoftLounge, "interior"),
      makeTile("living-room-8", "Charcoal Lounge", images.wallCharcoalLounge, "interior"),
    ],
  },
  {
    id: "bedroom",
    title: "Bedroom",
    items: [
      makeTile("bedroom-1", "Primary Suite", images.homeMasterSuite, "interior"),
      makeTile("bedroom-2", "Boho Bedroom", images.paywallBedroom, "interior"),
      makeTile("bedroom-3", "Midnight Bedroom", images.wallMidnightBedroom, "interior"),
      makeTile("bedroom-4", "Sage Suite", images.wallSageSuite, "interior"),
    ],
  },
  {
    id: "bathroom",
    title: "Bathroom",
    items: [
      makeTile("bathroom-1", "Stone Bathroom", images.homeBathroom, "interior"),
      makeTile("bathroom-2", "Lavender Bath", images.wallLavenderBath, "interior"),
    ],
  },
  {
    id: "coffee-shop",
    title: "Coffee Shop",
    items: [
      makeTile("coffee-shop-1", "Cafe Counter", images.paywallKitchen, "interior"),
      makeTile("coffee-shop-2", "Soft Barista Kitchen", images.homeKitchen, "interior"),
      makeTile("coffee-shop-3", "Ivory Espresso Bar", images.wallIvoryKitchen, "interior"),
    ],
  },
  {
    id: "study-room",
    title: "Study Room",
    items: [
      makeTile("study-room-1", "Library Study", images.homeLibrary, "interior"),
      makeTile("study-room-2", "Focused Study", images.homeStudy, "interior"),
      makeTile("study-room-3", "Olive Study", images.wallOliveStudy, "interior"),
    ],
  },
  {
    id: "restaurant",
    title: "Restaurant",
    items: [
      makeTile("restaurant-1", "Dining Room", images.homeDiningRoom, "interior"),
      makeTile("restaurant-2", "Terracotta Dining", images.wallTerracottaDining, "interior"),
      makeTile("restaurant-3", "Editorial Dining", images.paywallDining, "interior"),
    ],
  },
  {
    id: "gaming-room",
    title: "Gaming Room",
    items: [
      makeTile("gaming-room-1", "Gaming Room", images.homeGamingRoom, "interior"),
      makeTile("gaming-room-2", "Editorial Lounge", images.loungeEditorial, "interior"),
      makeTile("gaming-room-3", "Neon Gaming", images.paywallGaming, "interior"),
    ],
  },
  {
    id: "office",
    title: "Office",
    items: [
      makeTile("office-1", "Executive Office", images.homeOffice, "interior"),
      makeTile("office-2", "Study Office", images.homeStudy, "interior"),
      makeTile("office-3", "Gallery Office", images.wallPearlSalon, "interior"),
      makeTile("office-4", "Olive Office", images.wallOliveStudy, "interior"),
    ],
  },
  {
    id: "attic",
    title: "Attic",
    items: [
      makeTile("attic-1", "Loft Lounge", images.homeTheater, "interior"),
      makeTile("attic-2", "Warm Attic Suite", images.homeMasterSuite, "interior"),
    ],
  },
  {
    id: "toilet",
    title: "Toilet",
    items: [
      makeTile("toilet-1", "Compact Toilet", images.homeBathroom, "interior"),
      makeTile("toilet-2", "Powder Bath", images.wallLavenderBath, "interior"),
    ],
  },
  {
    id: "balcony",
    title: "Balcony",
    items: [
      makeTile("balcony-1", "Terrace Balcony", images.gardenTerrace, "interior"),
      makeTile("balcony-2", "Deck Balcony", images.gardenDeck, "interior"),
      makeTile("balcony-3", "Villa Balcony", images.gardenVillaEntry, "interior"),
    ],
  },
  {
    id: "hall",
    title: "Hall",
    items: [
      makeTile("hall-1", "Grand Hall", images.homeHall, "interior"),
      makeTile("hall-2", "Entry Hall", images.gardenVillaEntry, "interior"),
    ],
  },
  {
    id: "deck",
    title: "Deck",
    items: [
      makeTile("deck-1", "Timber Deck", images.gardenDeck, "interior"),
      makeTile("deck-2", "Spa Deck", images.gardenSpaDeck, "interior"),
      makeTile("deck-3", "Pool Deck", images.paywallGarden, "interior"),
    ],
  },
];

const EXTERIOR_GROUPS: DiscoverGroup[] = [
  {
    id: "apartment",
    title: "Apartment",
    items: [
      makeTile("apartment-1", "Eco Apartments", images.exteriorApartments, "exterior"),
      makeTile("apartment-2", "Apartment Block", images.exteriorApartmentBlock, "exterior"),
    ],
  },
  {
    id: "house",
    title: "House",
    items: [
      makeTile("house-1", "Modern House Day", images.exteriorModernHouseDay, "exterior"),
      makeTile("house-2", "Modern House Night", images.exteriorModernHouseNight, "exterior"),
      makeTile("house-3", "Stone Manor", images.exteriorStoneManor, "exterior"),
    ],
  },
  {
    id: "office-building",
    title: "Office Building",
    items: [
      makeTile("office-building-1", "Glass Office", images.exteriorGlassOfficeAfter, "exterior"),
      makeTile("office-building-2", "Glass Office Tower", images.exteriorGlassOffice, "exterior"),
    ],
  },
  {
    id: "villa",
    title: "Villa",
    items: [
      makeTile("villa-1", "Stone Villa", images.exteriorStoneVilla, "exterior"),
      makeTile("villa-2", "Modern Villa", images.exteriorModernVilla, "exterior"),
    ],
  },
  {
    id: "residential",
    title: "Residential",
    items: [
      makeTile("residential-1", "Pool House", images.exteriorPoolHouse, "exterior"),
      makeTile("residential-2", "Stone Manor", images.exteriorStoneManor, "exterior"),
      makeTile("residential-3", "Modern Villa", images.exteriorModernVilla, "exterior"),
    ],
  },
  {
    id: "retail",
    title: "Retail",
    items: [
      makeTile("retail-1", "Retail Store", images.exteriorRetailStore, "exterior"),
      makeTile("retail-2", "Retail Storefront", images.exteriorRetailStorefront, "exterior"),
    ],
  },
];

const GARDEN_GROUPS: DiscoverGroup[] = [
  {
    id: "garden",
    title: "Garden",
    items: [
      makeTile("garden-1", "Infinity Pool", images.gardenInfinityPoolAfter, "garden"),
      makeTile("garden-2", "Luminous Garden Walk", images.gardenLuminousWalkAfter, "garden"),
      makeTile("garden-3", "Sunset Fire Pit", images.gardenSunsetFirePitAfter, "garden"),
      makeTile("garden-4", "Tropical Pool Lounge", images.gardenTropicalPoolAfter, "garden"),
      makeTile("garden-5", "Waterfall Court", images.gardenWaterfallAfter, "garden"),
      makeTile("garden-6", "Backyard", images.gardenBackyard, "garden"),
      makeTile("garden-7", "Deck", images.gardenDeck, "garden"),
      makeTile("garden-8", "Fireside Patio", images.gardenFiresidePatio, "garden"),
      makeTile("garden-9", "Front Yard", images.gardenFrontYard, "garden"),
      makeTile("garden-10", "Infinity Pool", images.gardenInfinityPool, "garden"),
      makeTile("garden-11", "Patio", images.gardenPatio, "garden"),
      makeTile("garden-12", "Pool Courtyard", images.gardenPoolCourtyard, "garden"),
      makeTile("garden-13", "Spa Deck", images.gardenSpaDeck, "garden"),
      makeTile("garden-14", "Sunset Lounge", images.gardenSunsetLounge, "garden"),
      makeTile("garden-15", "Swimming Pool", images.gardenSwimmingPool, "garden"),
      makeTile("garden-16", "Terrace", images.gardenTerrace, "garden"),
      makeTile("garden-17", "Villa Entry", images.gardenVillaEntry, "garden"),
    ],
  },
];

const WALL_GROUPS: DiscoverGroup[] = [
  {
    id: "wall",
    title: "Wall",
    items: [
      makeTile("wall-1", "Olive Study", images.wallOliveStudy, "paint"),
      makeTile("wall-2", "Dusty Rose Retreat", images.wallDustyRose, "paint"),
      makeTile("wall-3", "Gallery Charcoal", images.wallCharcoalLounge, "paint"),
      makeTile("wall-4", "Lavender Mist Bath", images.wallLavenderBath, "paint"),
      makeTile("wall-5", "Midnight Navy Bedroom", images.wallMidnightBedroom, "paint"),
      makeTile("wall-6", "Pearl Gray Salon", images.wallPearlSalon, "paint"),
      makeTile("wall-7", "Sage Suite", images.wallSageSuite, "paint"),
      makeTile("wall-8", "Soft Ivory Kitchen", images.wallIvoryKitchen, "paint"),
      makeTile("wall-9", "Terracotta Dining", images.wallTerracottaDining, "paint"),
      makeTile("wall-10", "Botanical Mural", images.wallBotanical, "paint"),
      makeTile("wall-11", "Linear Slats", images.wallLinear, "paint"),
      makeTile("wall-12", "Concrete Finish", images.wallConcrete, "paint"),
      makeTile("wall-13", "Sage Plaster", images.wallSagePlaster, "paint"),
      makeTile("wall-14", "Veined Marble", images.wallMarble, "paint"),
    ],
  },
];

const FLOOR_GROUPS: DiscoverGroup[] = [
  {
    id: "floor",
    title: "Floor",
    items: [
      makeTile("floor-1", "Carrara Marble Flow", images.floorCarraraAfter, "floor"),
      makeTile("floor-2", "Heritage Herringbone", images.floorHerringboneAfter, "floor"),
      makeTile("floor-3", "Satin Concrete", images.floorConcreteAfter, "floor"),
      makeTile("floor-4", "Soft Limestone", images.floorLimestoneAfter, "floor"),
      makeTile("floor-5", "Walnut Gloss", images.floorWalnutAfter, "floor"),
      makeTile("floor-6", "Walnut Plank", images.floorWalnutPlank, "floor"),
      makeTile("floor-7", "Industrial Concrete", images.floorConcrete, "floor"),
      makeTile("floor-8", "Modern Slate", images.floorSlate, "floor"),
      makeTile("floor-9", "Natural Oak", images.floorNaturalOak, "floor"),
      makeTile("floor-10", "Plush Carpet", images.floorCarpet, "floor"),
      makeTile("floor-11", "Polished Carrara", images.floorCarrara, "floor"),
      makeTile("floor-12", "Terracotta Tile", images.floorTerracotta, "floor"),
      makeTile("floor-13", "Walnut Chevron", images.floorChevron, "floor"),
      makeTile("floor-14", "Weathered Oak", images.floorWeatheredOak, "floor"),
    ],
  },
];

const DISCOVER_CATALOG: Record<DiscoverTabId, DiscoverGroup[]> = {
  home: HOME_GROUPS,
  garden: GARDEN_GROUPS,
  exterior: EXTERIOR_GROUPS,
  wall: WALL_GROUPS,
  floor: FLOOR_GROUPS,
};

export function getDiscoverGroups(tabId: DiscoverTabId): DiscoverGroup[] {
  return DISCOVER_CATALOG[tabId] ?? [];
}

export function getDiscoverGroup(
  tabId: DiscoverTabId,
  groupId: string,
): DiscoverGroup | undefined {
  return DISCOVER_CATALOG[tabId]?.find((group) => group.id === groupId);
}
