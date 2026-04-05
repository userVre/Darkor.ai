import type { ImageSourcePropType } from "react-native";

export type DiscoverTabId = "home" | "garden" | "exterior";
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
  { id: "exterior", label: "Exterior" },
] as const satisfies ReadonlyArray<{ id: DiscoverTabId; label: string }>;

const images = {
  homeKitchenAfter: require("../assets/media/discover/injected/home/kitchen.png"),
  homeLivingRoomAfter: require("../assets/media/discover/injected/home/living-room.png"),
  homeDiningRoomAfter: require("../assets/media/discover/injected/home/dining-room.png"),
  homeBedroomAfter: require("../assets/media/discover/injected/home/bedroom.png"),
  homeBathroomAfter: require("../assets/media/discover/injected/home/bathroom.png"),
  homeGamingRoomAfter: require("../assets/media/discover/injected/home/gaming-room.png"),
  homeOfficeAfter: require("../assets/media/discover/injected/home/home-office.png"),
  homeCoffeeShopAfter: require("../assets/media/discover/injected/home/coffee-shop.png"),
  homeStudyRoomAfter: require("../assets/media/discover/injected/home/study-room.png"),
  homeRestaurantAfter: require("../assets/media/discover/injected/home/restaurant.png"),
  homeAtticAfter: require("../assets/media/discover/injected/home/attic.png"),
  homeToiletAfter: require("../assets/media/discover/injected/home/toilet.png"),
  homeBalconyAfter: require("../assets/media/discover/injected/home/balcony.png"),
  homeHallAfter: require("../assets/media/discover/injected/home/hall.png"),
  homeDeckAfter: require("../assets/media/discover/injected/home/deck.png"),
  interiorScene1: require("../assets/media/discover/injected/interior/scene-1.png"),
  interiorScene2: require("../assets/media/discover/injected/interior/scene-2.png"),
  interiorScene3: require("../assets/media/discover/injected/interior/scene-3.png"),
  interiorScene4: require("../assets/media/discover/injected/interior/scene-4.png"),
  interiorScene5: require("../assets/media/discover/injected/interior/scene-5.png"),
  exteriorAfterApartment: require("../assets/media/discover/exterior/exterior-after-eco-apartments.jpg"),
  exteriorAfterHouse: require("../assets/media/discover/exterior/exterior-after-modern-house-day.jpg"),
  exteriorAfterOffice: require("../assets/media/discover/exterior/exterior-after-glass-office.jpg"),
  exteriorAfterVilla: require("../assets/media/discover/exterior/exterior-after-stone-villa.jpg"),
  exteriorAfterResidential: require("../assets/media/discover/exterior/exterior-after-modern-house-night.jpg"),
  exteriorApartmentBlock: require("../assets/media/discover/exterior/exterior-apartment-block.jpg"),
  exteriorModernVilla: require("../assets/media/discover/exterior/exterior-modern-villa.jpg"),
  exteriorGlassOffice: require("../assets/media/discover/exterior/exterior-glass-office.jpg"),
  exteriorRetailStore: require("../assets/media/discover/exterior/exterior-retail-store.jpg"),
  exteriorRetailStorefront: require("../assets/media/discover/exterior/exterior-retail-storefront.jpg"),
  exteriorStoneManor: require("../assets/media/discover/exterior/exterior-stone-manor.jpg"),
  exteriorPoolHouse: require("../assets/media/discover/exterior/exterior-pool-house.jpg"),
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
  homeKitchen: require("../assets/media/discover/home/home-kitchen.jpg"),
  homeLivingRoom: require("../assets/media/discover/home/home-living-room.jpg"),
  homeDiningRoom: require("../assets/media/discover/home/home-dining-room.jpg"),
  homeBedroom: require("../assets/media/discover/home/home-master-suite.jpg"),
  homeBathroom: require("../assets/media/discover/home/home-bathroom.jpg"),
  homeGamingRoom: require("../assets/media/discover/home/home-gaming-room.jpg"),
  homeOffice: require("../assets/media/discover/home/home-home-office.jpg"),
  homeStudy: require("../assets/media/discover/home/home-study.jpg"),
  homeHall: require("../assets/media/discover/home/home-hall.jpg"),
  gardenTerrace: require("../assets/media/discover/garden/garden-terrace.jpg"),
  gardenDeck: require("../assets/media/discover/garden/garden-deck.jpg"),
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
      makeTile("kitchen-after", "Kitchen After", images.homeKitchenAfter, "interior"),
      makeTile("kitchen-reference", "Kitchen Reference", images.homeKitchen, "interior"),
    ],
  },
  {
    id: "living-room",
    title: "Living Room",
    items: [
      makeTile("living-room-after", "Living Room After", images.homeLivingRoomAfter, "interior"),
      makeTile("living-room-reference", "Living Room Reference", images.homeLivingRoom, "interior"),
    ],
  },
  {
    id: "dining-room",
    title: "Dining Room",
    items: [
      makeTile("dining-room-after", "Dining Room After", images.homeDiningRoomAfter, "interior"),
      makeTile("dining-room-reference", "Dining Room Reference", images.homeDiningRoom, "interior"),
    ],
  },
  {
    id: "bedroom",
    title: "Bedroom",
    items: [
      makeTile("bedroom-after", "Bedroom After", images.homeBedroomAfter, "interior"),
      makeTile("bedroom-reference", "Bedroom Reference", images.homeBedroom, "interior"),
    ],
  },
  {
    id: "bathroom",
    title: "Bathroom",
    items: [
      makeTile("bathroom-after", "Bathroom After", images.homeBathroomAfter, "interior"),
      makeTile("bathroom-reference", "Bathroom Reference", images.homeBathroom, "interior"),
    ],
  },
  {
    id: "gaming-room",
    title: "Gaming Room",
    items: [
      makeTile("gaming-room-after", "Gaming Room After", images.homeGamingRoomAfter, "interior"),
      makeTile("gaming-room-reference", "Gaming Room Reference", images.homeGamingRoom, "interior"),
    ],
  },
  {
    id: "home-office",
    title: "Home Office",
    items: [
      makeTile("home-office-after", "Home Office After", images.homeOfficeAfter, "interior"),
      makeTile("home-office-reference", "Home Office Reference", images.homeOffice, "interior"),
    ],
  },
  {
    id: "coffee-shop",
    title: "Coffee Shop",
    items: [
      makeTile("coffee-shop-after", "Coffee Shop After", images.homeCoffeeShopAfter, "interior"),
      makeTile("coffee-shop-reference", "Coffee Shop Reference", images.interiorScene1, "interior"),
    ],
  },
  {
    id: "study-room",
    title: "Study Room",
    items: [
      makeTile("study-room-after", "Study Room After", images.homeStudyRoomAfter, "interior"),
      makeTile("study-room-reference", "Study Room Reference", images.homeStudy, "interior"),
    ],
  },
  {
    id: "restaurant",
    title: "Restaurant",
    items: [
      makeTile("restaurant-after", "Restaurant After", images.homeRestaurantAfter, "interior"),
      makeTile("restaurant-reference", "Restaurant Reference", images.homeDiningRoom, "interior"),
    ],
  },
  {
    id: "attic",
    title: "Attic",
    items: [
      makeTile("attic-after", "Attic After", images.homeAtticAfter, "interior"),
      makeTile("attic-reference", "Attic Reference", images.interiorScene3, "interior"),
    ],
  },
  {
    id: "toilet",
    title: "Toilet",
    items: [
      makeTile("toilet-after", "Toilet After", images.homeToiletAfter, "interior"),
      makeTile("toilet-reference", "Toilet Reference", images.homeBathroom, "interior"),
    ],
  },
  {
    id: "balcony",
    title: "Balcony",
    items: [
      makeTile("balcony-after", "Balcony After", images.homeBalconyAfter, "interior"),
      makeTile("balcony-reference", "Balcony Reference", images.gardenTerrace, "interior"),
    ],
  },
  {
    id: "hall",
    title: "Hall",
    items: [
      makeTile("hall-after", "Hall After", images.homeHallAfter, "interior"),
      makeTile("hall-reference", "Hall Reference", images.homeHall, "interior"),
    ],
  },
  {
    id: "deck",
    title: "Deck",
    items: [
      makeTile("deck-after", "Deck After", images.homeDeckAfter, "interior"),
      makeTile("deck-reference", "Deck Reference", images.gardenDeck, "interior"),
    ],
  },
];

const GARDEN_GROUPS: DiscoverGroup[] = [
  {
    id: "garden",
    title: "Garden",
    items: [
      makeTile("garden-1", "Garden Scene 1", images.gardenScene1, "garden"),
      makeTile("garden-2", "Garden Scene 2", images.gardenScene2, "garden"),
      makeTile("garden-3", "Garden Scene 3", images.gardenScene3, "garden"),
      makeTile("garden-4", "Garden Scene 4", images.gardenScene4, "garden"),
      makeTile("garden-5", "Garden Scene 5", images.gardenScene5, "garden"),
    ],
  },
  {
    id: "wall",
    title: "Wall",
    items: [
      makeTile("wall-1", "Wall Scene 1", images.wallScene1, "paint"),
      makeTile("wall-2", "Wall Scene 2", images.wallScene2, "paint"),
      makeTile("wall-3", "Wall Scene 3", images.wallScene3, "paint"),
      makeTile("wall-4", "Wall Scene 4", images.wallScene4, "paint"),
      makeTile("wall-5", "Wall Scene 5", images.wallScene5, "paint"),
    ],
  },
  {
    id: "floor",
    title: "Floor",
    items: [
      makeTile("floor-1", "Floor Scene 1", images.floorScene1, "floor"),
      makeTile("floor-2", "Floor Scene 2", images.floorScene2, "floor"),
      makeTile("floor-3", "Floor Scene 3", images.floorScene3, "floor"),
      makeTile("floor-4", "Floor Scene 4", images.floorScene4, "floor"),
      makeTile("floor-5", "Floor Scene 5", images.floorScene5, "floor"),
    ],
  },
];

const EXTERIOR_GROUPS: DiscoverGroup[] = [
  {
    id: "apartment",
    title: "Apartment",
    items: [
      makeTile("apartment-after", "Apartment After", images.exteriorAfterApartment, "exterior"),
      makeTile("apartment-reference", "Apartment Reference", images.exteriorApartmentBlock, "exterior"),
    ],
  },
  {
    id: "house",
    title: "House",
    items: [
      makeTile("house-after", "House After", images.exteriorAfterHouse, "exterior"),
      makeTile("house-reference", "House Reference", images.exteriorStoneManor, "exterior"),
    ],
  },
  {
    id: "office-building",
    title: "Office Building",
    items: [
      makeTile("office-building-after", "Office Building After", images.exteriorAfterOffice, "exterior"),
      makeTile("office-building-reference", "Office Building Reference", images.exteriorGlassOffice, "exterior"),
    ],
  },
  {
    id: "villa",
    title: "Villa",
    items: [
      makeTile("villa-after", "Villa After", images.exteriorAfterVilla, "exterior"),
      makeTile("villa-reference", "Villa Reference", images.exteriorModernVilla, "exterior"),
    ],
  },
  {
    id: "residential",
    title: "Residential",
    items: [
      makeTile("residential-after", "Residential After", images.exteriorAfterResidential, "exterior"),
      makeTile("residential-reference", "Residential Reference", images.exteriorPoolHouse, "exterior"),
    ],
  },
  {
    id: "retail",
    title: "Retail",
    items: [
      makeTile("retail-reference-1", "Retail Reference 1", images.exteriorRetailStorefront, "exterior"),
      makeTile("retail-reference-2", "Retail Reference 2", images.exteriorRetailStore, "exterior"),
    ],
  },
];

const DISCOVER_CATALOG: Record<DiscoverTabId, DiscoverGroup[]> = {
  home: HOME_GROUPS,
  garden: GARDEN_GROUPS,
  exterior: EXTERIOR_GROUPS,
};

export function getDiscoverGroups(tabId: DiscoverTabId): DiscoverGroup[] {
  return DISCOVER_CATALOG[tabId] ?? [];
}

export function getDiscoverGroup(tabId: DiscoverTabId, groupId: string): DiscoverGroup | undefined {
  return DISCOVER_CATALOG[tabId]?.find((group) => group.id === groupId);
}
