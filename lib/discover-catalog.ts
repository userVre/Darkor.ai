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
  { id: "home", label: "Home" },
  { id: "garden", label: "Garden" },
  { id: "exterior", label: "Exterior Design" },
] as const satisfies ReadonlyArray<{ id: DiscoverTabId; label: string }>;

const images = {
  interiorScene1: require("../assets/media/discover/injected/interior/scene-1.png"),
  interiorScene2: require("../assets/media/discover/injected/interior/scene-2.png"),
  interiorScene3: require("../assets/media/discover/injected/interior/scene-3.png"),
  interiorScene4: require("../assets/media/discover/injected/interior/scene-4.png"),
  interiorScene5: require("../assets/media/discover/injected/interior/scene-5.png"),
  exteriorScene1: require("../assets/media/discover/injected/exterior/scene-1.png"),
  exteriorScene2: require("../assets/media/discover/injected/exterior/scene-2.png"),
  exteriorScene3: require("../assets/media/discover/injected/exterior/scene-3.png"),
  exteriorScene4: require("../assets/media/discover/injected/exterior/scene-4.png"),
  exteriorScene5: require("../assets/media/discover/injected/exterior/scene-5.png"),
  gardenScene1: require("../assets/media/discover/injected/garden/scene-1.png"),
  gardenScene2: require("../assets/media/discover/injected/garden/scene-2.png"),
  gardenScene3: require("../assets/media/discover/injected/garden/scene-3.png"),
  gardenScene4: require("../assets/media/discover/injected/garden/scene-4.png"),
  gardenScene5: require("../assets/media/discover/injected/garden/scene-5.png"),
  floorScene1: require("../assets/media/discover/injected/floor/scene-1.png"),
  floorScene2: require("../assets/media/discover/injected/floor/scene-2.png"),
  floorScene3: require("../assets/media/discover/injected/floor/scene-3.png"),
  floorScene4: require("../assets/media/discover/injected/floor/scene-4.png"),
  floorScene5: require("../assets/media/discover/injected/floor/scene-5.png"),
  wallScene1: require("../assets/media/discover/injected/wall/scene-1.png"),
  wallScene2: require("../assets/media/discover/injected/wall/scene-2.png"),
  wallScene3: require("../assets/media/discover/injected/wall/scene-3.png"),
  wallScene4: require("../assets/media/discover/injected/wall/scene-4.png"),
  wallScene5: require("../assets/media/discover/injected/wall/scene-5.png"),
  homeBathroom: require("../assets/media/discover/home/home-bathroom.jpg"),
  homeDiningRoom: require("../assets/media/discover/home/home-dining-room.jpg"),
  homeGamingRoom: require("../assets/media/discover/home/home-gaming-room.jpg"),
  homeHall: require("../assets/media/discover/home/home-hall.jpg"),
  homeOffice: require("../assets/media/discover/home/home-home-office.jpg"),
  homeTheater: require("../assets/media/discover/home/home-home-theater.jpg"),
  homeKitchen: require("../assets/media/discover/home/home-kitchen.jpg"),
  homeLibrary: require("../assets/media/discover/home/home-library.jpg"),
  homeStudy: require("../assets/media/discover/home/home-study.jpg"),
  homeMasterSuite: require("../assets/media/discover/home/home-master-suite.jpg"),
  gardenDeck: require("../assets/media/discover/garden/garden-deck.jpg"),
  gardenTerrace: require("../assets/media/discover/garden/garden-terrace.jpg"),
  gardenVillaEntry: require("../assets/media/discover/garden/garden-villa-entry.jpg"),
  gardenSpaDeck: require("../assets/media/discover/garden/garden-spa-deck.jpg"),
  exteriorApartmentBlock: require("../assets/media/discover/exterior/exterior-apartment-block.jpg"),
  exteriorModernVilla: require("../assets/media/discover/exterior/exterior-modern-villa.jpg"),
  exteriorRetailStorefront: require("../assets/media/discover/exterior/exterior-retail-storefront.jpg"),
  exteriorStoneManor: require("../assets/media/discover/exterior/exterior-stone-manor.jpg"),
  paywallBedroom: require("../assets/media/paywall/paywall-boho-bedroom.png"),
  paywallGaming: require("../assets/media/paywall/paywall-gaming-room.png"),
} as const;

function makeTile(
  id: string,
  title: string,
  image: ImageSourcePropType,
  service: DiscoverService,
): DiscoverTile {
  return { id, title, image, service };
}

const HOME_GROUPS: DiscoverGroup[] = [
  {
    id: "kitchen",
    title: "Kitchen",
    items: [
      makeTile("kitchen-1", "Kitchen After", images.interiorScene5, "interior"),
      makeTile("kitchen-2", "Minimal Kitchen", images.homeKitchen, "interior"),
    ],
  },
  {
    id: "living-room",
    title: "Living Room",
    items: [
      makeTile("living-room-1", "Living Room After", images.interiorScene1, "interior"),
      makeTile("living-room-2", "Gallery Living", images.interiorScene4, "interior"),
    ],
  },
  {
    id: "bedroom",
    title: "Bedroom",
    items: [
      makeTile("bedroom-1", "Bedroom Mood", images.paywallBedroom, "interior"),
      makeTile("bedroom-2", "Suite", images.homeMasterSuite, "interior"),
    ],
  },
  {
    id: "bathroom",
    title: "Bathroom",
    items: [
      makeTile("bathroom-1", "Bathroom", images.homeBathroom, "interior"),
      makeTile("bathroom-2", "Powder Room", images.wallScene3, "interior"),
    ],
  },
  {
    id: "dining-room",
    title: "Dining Room",
    items: [
      makeTile("dining-room-1", "Dining Room After", images.interiorScene4, "interior"),
      makeTile("dining-room-2", "Dining Interior", images.homeDiningRoom, "interior"),
    ],
  },
  {
    id: "coffee-shop",
    title: "Coffee Shop",
    items: [
      makeTile("coffee-shop-1", "Coffee Shop", images.interiorScene5, "interior"),
      makeTile("coffee-shop-2", "Cafe Interior", images.homeKitchen, "interior"),
    ],
  },
  {
    id: "study-room",
    title: "Study Room",
    items: [
      makeTile("study-room-1", "Study Room", images.homeStudy, "interior"),
      makeTile("study-room-2", "Library Desk", images.homeLibrary, "interior"),
    ],
  },
  {
    id: "restaurant",
    title: "Restaurant",
    items: [
      makeTile("restaurant-1", "Restaurant", images.homeDiningRoom, "interior"),
      makeTile("restaurant-2", "Editorial Dining", images.interiorScene4, "interior"),
    ],
  },
  {
    id: "gaming-room",
    title: "Gaming Room",
    items: [
      makeTile("gaming-room-1", "Gaming Room", images.paywallGaming, "interior"),
      makeTile("gaming-room-2", "Gaming Setup", images.homeGamingRoom, "interior"),
    ],
  },
  {
    id: "office",
    title: "Office",
    items: [
      makeTile("office-1", "Office After", images.interiorScene2, "interior"),
      makeTile("office-2", "Office Studio", images.homeOffice, "interior"),
    ],
  },
  {
    id: "attic",
    title: "Attic",
    items: [
      makeTile("attic-1", "Attic After", images.interiorScene3, "interior"),
      makeTile("attic-2", "Loft Space", images.homeTheater, "interior"),
    ],
  },
  {
    id: "toilet",
    title: "Toilet",
    items: [
      makeTile("toilet-1", "Toilet", images.homeBathroom, "interior"),
      makeTile("toilet-2", "Bright Toilet", images.wallScene3, "interior"),
    ],
  },
  {
    id: "balcony",
    title: "Balcony",
    items: [
      makeTile("balcony-1", "Balcony", images.gardenTerrace, "interior"),
      makeTile("balcony-2", "City Balcony", images.gardenVillaEntry, "interior"),
    ],
  },
  {
    id: "hall",
    title: "Hall",
    items: [
      makeTile("hall-1", "Hall", images.homeHall, "interior"),
      makeTile("hall-2", "Entrance Hall", images.wallScene2, "interior"),
    ],
  },
  {
    id: "deck",
    title: "Deck",
    items: [
      makeTile("deck-1", "Deck", images.gardenDeck, "interior"),
      makeTile("deck-2", "Spa Deck", images.gardenSpaDeck, "interior"),
    ],
  },
];

const EXTERIOR_GROUPS: DiscoverGroup[] = [
  {
    id: "apartment",
    title: "Apartment",
    items: [
      makeTile("apartment-1", "Apartment After", images.exteriorScene5, "exterior"),
      makeTile("apartment-2", "Apartment Block", images.exteriorApartmentBlock, "exterior"),
    ],
  },
  {
    id: "house",
    title: "House",
    items: [
      makeTile("house-1", "House After", images.exteriorScene3, "exterior"),
      makeTile("house-2", "Stone Manor", images.exteriorStoneManor, "exterior"),
    ],
  },
  {
    id: "office-building",
    title: "Office Building",
    items: [
      makeTile("office-building-1", "Office Building After", images.exteriorScene4, "exterior"),
      makeTile("office-building-2", "Office Building", images.exteriorScene2, "exterior"),
    ],
  },
  {
    id: "residential",
    title: "Residential",
    items: [
      makeTile("residential-1", "Residential After", images.exteriorScene1, "exterior"),
      makeTile("residential-2", "Modern Villa", images.exteriorModernVilla, "exterior"),
    ],
  },
  {
    id: "retail",
    title: "Retail",
    items: [
      makeTile("retail-1", "Retail After", images.exteriorScene4, "exterior"),
      makeTile("retail-2", "Retail Storefront", images.exteriorRetailStorefront, "exterior"),
    ],
  },
];

const GARDEN_GROUPS: DiscoverGroup[] = [
  {
    id: "garden",
    title: "Garden",
    items: [
      makeTile("garden-1", "Garden 1", images.gardenScene1, "garden"),
      makeTile("garden-2", "Garden 2", images.gardenScene2, "garden"),
      makeTile("garden-3", "Garden 3", images.gardenScene3, "garden"),
      makeTile("garden-4", "Garden 4", images.gardenScene4, "garden"),
      makeTile("garden-5", "Garden 5", images.gardenScene5, "garden"),
    ],
  },
];

const WALL_GROUPS: DiscoverGroup[] = [
  {
    id: "wall",
    title: "Wall",
    items: [
      makeTile("wall-1", "Wall 1", images.wallScene1, "paint"),
      makeTile("wall-2", "Wall 2", images.wallScene2, "paint"),
      makeTile("wall-3", "Wall 3", images.wallScene3, "paint"),
      makeTile("wall-4", "Wall 4", images.wallScene4, "paint"),
      makeTile("wall-5", "Wall 5", images.wallScene5, "paint"),
    ],
  },
];

const FLOOR_GROUPS: DiscoverGroup[] = [
  {
    id: "floor",
    title: "Floor",
    items: [
      makeTile("floor-1", "Floor 1", images.floorScene1, "floor"),
      makeTile("floor-2", "Floor 2", images.floorScene2, "floor"),
      makeTile("floor-3", "Floor 3", images.floorScene3, "floor"),
      makeTile("floor-4", "Floor 4", images.floorScene4, "floor"),
      makeTile("floor-5", "Floor 5", images.floorScene5, "floor"),
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

export function getDiscoverGroup(tabId: DiscoverTabId, groupId: string): DiscoverGroup | undefined {
  return DISCOVER_CATALOG[tabId]?.find((group) => group.id === groupId);
}
