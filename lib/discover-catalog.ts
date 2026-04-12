import type { ImageSourcePropType } from "react-native";

export type DiscoverTabId = "home" | "garden" | "exterior";
export type DiscoverService = "interior" | "garden" | "exterior" | "floor" | "paint";

export type DiscoverTile = {
  id: string;
  title: string;
  previewTitle: string;
  image: ImageSourcePropType;
  service: DiscoverService;
};

export type DiscoverGroup = {
  id: string;
  title: string;
  items: DiscoverTile[];
};

export const DISCOVER_TABS = [
  { id: "home", label: "Interiors" },
  { id: "exterior", label: "Exteriors" },
  { id: "garden", label: "Garden" },
] as const satisfies ReadonlyArray<{ id: DiscoverTabId; label: string }>;

const DISCOVER_IMAGES = {
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
  homeKitchen: require("../assets/media/discover/home/home-kitchen.jpg"),
  homeLivingRoom: require("../assets/media/discover/home/home-living-room.jpg"),
  homeDiningRoom: require("../assets/media/discover/home/home-dining-room.jpg"),
  homeBedroom: require("../assets/media/discover/home/home-master-suite.jpg"),
  homeBathroom: require("../assets/media/discover/home/home-bathroom.jpg"),
  homeGamingRoom: require("../assets/media/discover/home/home-gaming-room.jpg"),
  homeOffice: require("../assets/media/discover/home/home-home-office.jpg"),
  homeStudy: require("../assets/media/discover/home/home-study.jpg"),
  homeHall: require("../assets/media/discover/home/home-hall.jpg"),
  homeHomeTheater: require("../assets/media/discover/home/home-home-theater.jpg"),
  homeLibrary: require("../assets/media/discover/home/home-library.jpg"),
  homeLaundry: require("../assets/media/discover/home/home-laundry.jpg"),
  homeNursery: require("../assets/media/discover/home/home-nursery.jpg"),
  livingEditorial: require("../assets/media/discover/home/interior-after-editorial-lounge.jpg"),
  livingGrand: require("../assets/media/discover/home/interior-after-grand-salon.jpg"),
  livingMoody: require("../assets/media/discover/home/interior-after-moody-club.jpg"),
  livingOrganic: require("../assets/media/discover/home/interior-after-organic-living.jpg"),
  livingSerene: require("../assets/media/discover/home/interior-after-serene-lounge.jpg"),
  roomBathroom: require("../assets/media/rooms/room-bathroom.jpg"),
  roomDiningRoom: require("../assets/media/rooms/room-dining-room.jpg"),
  roomHall: require("../assets/media/rooms/room-hall.jpg"),
  roomHomeOffice: require("../assets/media/rooms/room-home-office.jpg"),
  roomHomeTheater: require("../assets/media/rooms/room-home-theater.jpg"),
  roomKitchen: require("../assets/media/rooms/room-kitchen.jpg"),
  roomLivingRoom: require("../assets/media/rooms/room-living-room.jpg"),
  roomMasterSuite: require("../assets/media/rooms/room-master-suite.jpg"),
  roomNursery: require("../assets/media/rooms/room-nursery.jpg"),
  paywallBohoBedroom: require("../assets/media/paywall/paywall-boho-bedroom.png"),
  paywallDiningRoom: require("../assets/media/paywall/paywall-dining-room.png"),
  paywallGamingRoom: require("../assets/media/paywall/paywall-gaming-room.png"),
  paywallGardenPool: require("../assets/media/paywall/paywall-garden-pool.png"),
  paywallLuxuryLounge: require("../assets/media/paywall/paywall-luxury-lounge.png"),
  paywallMarbleKitchen: require("../assets/media/paywall/paywall-marble-kitchen.png"),
  paywallSoftLounge: require("../assets/media/paywall/paywall-soft-lounge.png"),
  exampleDamagedRoom: require("../assets/media/examples/interior/interior-before-damaged-room.jpg"),
  exampleEmptyKitchen: require("../assets/media/examples/interior/interior-before-empty-kitchen.jpg"),
  exampleEmptyRoom: require("../assets/media/examples/interior/interior-before-empty-room.jpg"),
  exampleMessyLounge: require("../assets/media/examples/interior/interior-before-messy-lounge.jpg"),
  exampleOutdatedKitchen: require("../assets/media/examples/interior/interior-before-outdated-kitchen.jpg"),
  exampleWornReadingRoom: require("../assets/media/examples/interior/interior-before-worn-reading-room.jpg"),
  wallDeepOliveStudy: require("../assets/media/discover/wall-scenes/deep-olive-study.jpg"),
  wallLavenderMistBath: require("../assets/media/discover/wall-scenes/lavender-mist-bath.jpg"),
  wallMidnightNavyBedroom: require("../assets/media/discover/wall-scenes/midnight-navy-bedroom.jpg"),
  wallSoftIvoryKitchen: require("../assets/media/discover/wall-scenes/soft-ivory-kitchen.jpg"),
  wallTerracottaDining: require("../assets/media/discover/wall-scenes/terracotta-dining.jpg"),
  wallSagePlaster: require("../assets/media/discover/wall-scenes/wall-after-sage-plaster.jpg"),
  wallVeinedMarble: require("../assets/media/discover/wall-scenes/wall-after-veined-marble.jpg"),
  gardenAfterInfinityPool: require("../assets/media/discover/garden/garden-after-infinity-pool.jpg"),
  gardenAfterGardenWalk: require("../assets/media/discover/garden/garden-after-luminous-garden-walk.jpg"),
  gardenAfterFirePit: require("../assets/media/discover/garden/garden-after-sunset-fire-pit.jpg"),
  gardenAfterTropicalPool: require("../assets/media/discover/garden/garden-after-tropical-pool-lounge.jpg"),
  gardenAfterWaterfallCourt: require("../assets/media/discover/garden/garden-after-waterfall-court.jpg"),
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
  exteriorAfterApartment: require("../assets/media/discover/exterior/exterior-after-eco-apartments.jpg"),
  exteriorAfterHouseDay: require("../assets/media/discover/exterior/exterior-after-modern-house-day.jpg"),
  exteriorAfterHouseNight: require("../assets/media/discover/exterior/exterior-after-modern-house-night.jpg"),
  exteriorAfterOffice: require("../assets/media/discover/exterior/exterior-after-glass-office.jpg"),
  exteriorAfterVilla: require("../assets/media/discover/exterior/exterior-after-stone-villa.jpg"),
  exteriorApartmentBlock: require("../assets/media/discover/exterior/exterior-apartment-block.jpg"),
  exteriorGarageSuite: require("../assets/media/discover/exterior/exterior-garage-suite.jpg"),
  exteriorGlassOffice: require("../assets/media/discover/exterior/exterior-glass-office.jpg"),
  exteriorModernVilla: require("../assets/media/discover/exterior/exterior-modern-villa.jpg"),
  exteriorPoolHouse: require("../assets/media/discover/exterior/exterior-pool-house.jpg"),
  exteriorPremiumGarage: require("../assets/media/discover/exterior/exterior-premium-garage.jpg"),
  exteriorRetailStore: require("../assets/media/discover/exterior/exterior-retail-store.jpg"),
  exteriorRetailStorefront: require("../assets/media/discover/exterior/exterior-retail-storefront.jpg"),
  exteriorStoneManor: require("../assets/media/discover/exterior/exterior-stone-manor.jpg"),
  exampleExteriorAbandoned: require("../assets/media/examples/exterior/exterior-before-abandoned-home.jpg"),
  exampleExteriorBrickShell: require("../assets/media/examples/exterior/exterior-before-brick-shell.jpg"),
  exampleExteriorConcreteFrame: require("../assets/media/examples/exterior/exterior-before-concrete-frame.jpg"),
  exampleExteriorOvergrown: require("../assets/media/examples/exterior/exterior-before-overgrown-cottage.jpg"),
  exampleExteriorScaffold: require("../assets/media/examples/exterior/exterior-before-scaffold-house.jpg"),
  exampleExteriorWeathered: require("../assets/media/examples/exterior/exterior-before-weathered-house.jpg"),
} as const;

type DiscoverImageKey = keyof typeof DISCOVER_IMAGES;

function makeTile(
  id: string,
  title: string,
  previewTitle: string,
  image: ImageSourcePropType,
  service: DiscoverService,
): DiscoverTile {
  return { id, title, previewTitle, image, service };
}

function makeImageId(groupTitle: string, index: number) {
  const normalizedTitle = groupTitle.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${normalizedTitle}_Image_${index + 1}`;
}

function makeGroup(
  id: string,
  title: string,
  service: DiscoverService,
  imageKeys: readonly DiscoverImageKey[],
): DiscoverGroup {
  return {
    id,
    title,
    items: imageKeys.map((imageKey, index) =>
      makeTile(
        makeImageId(title, index),
        `${title} Image ${index + 1}`,
        title,
        DISCOVER_IMAGES[imageKey],
        service,
      ),
    ),
  };
}

const HOME_GROUPS: DiscoverGroup[] = [
  makeGroup("kitchen", "Kitchen", "interior", [
    "paywallMarbleKitchen",
    "homeKitchenAfter",
    "homeKitchen",
    "wallSoftIvoryKitchen",
    "roomKitchen",
    "exampleEmptyKitchen",
    "exampleOutdatedKitchen",
  ]),
  makeGroup("living-room", "Living Room", "interior", [
    "paywallLuxuryLounge",
    "livingGrand",
    "homeLivingRoomAfter",
    "paywallSoftLounge",
    "livingOrganic",
    "livingSerene",
    "homeLivingRoom",
    "roomLivingRoom",
  ]),
  makeGroup("dining-room", "Dining Room", "interior", [
    "paywallDiningRoom",
    "homeDiningRoomAfter",
    "paywallLuxuryLounge",
    "livingGrand",
    "homeDiningRoomAfter",
    "homeDiningRoom",
    "roomDiningRoom",
    "wallTerracottaDining",
  ]),
  makeGroup("bedroom", "Bedroom", "interior", [
    "paywallBohoBedroom",
    "homeBedroomAfter",
    "homeBedroom",
    "roomMasterSuite",
    "wallMidnightNavyBedroom",
    "homeNursery",
    "homeNursery",
    "livingSerene",
  ]),
  makeGroup("bathroom", "Bathroom", "interior", [
    "wallVeinedMarble",
    "homeBathroomAfter",
    "homeBathroom",
    "roomBathroom",
    "wallLavenderMistBath",
    "wallSagePlaster",
    "homeToiletAfter",
  ]),
  makeGroup("gaming-room", "Gaming Room", "interior", [
    "paywallGamingRoom",
    "homeGamingRoomAfter",
    "homeGamingRoom",
    "livingMoody",
    "paywallSoftLounge",
    "homeHomeTheater",
    "roomHomeTheater",
  ]),
  makeGroup("home-office", "Home Office", "interior", [
    "paywallLuxuryLounge",
    "homeOfficeAfter",
    "homeOffice",
    "homeStudy",
    "homeLibrary",
    "wallDeepOliveStudy",
    "roomHomeOffice",
  ]),
  makeGroup("coffee-shop", "Coffee Shop", "interior", [
    "homeCoffeeShopAfter",
    "paywallSoftLounge",
    "paywallDiningRoom",
    "livingEditorial",
    "paywallDiningRoom",
    "homeDiningRoom",
    "roomDiningRoom",
    "homeKitchen",
  ]),
  makeGroup("study-room", "Study Room", "interior", [
    "homeStudyRoomAfter",
    "wallDeepOliveStudy",
    "homeLibrary",
    "homeStudy",
    "homeOffice",
    "roomHomeOffice",
    "exampleWornReadingRoom",
  ]),
  makeGroup("restaurant", "Restaurant", "interior", [
    "homeRestaurantAfter",
    "paywallLuxuryLounge",
    "paywallDiningRoom",
    "homeDiningRoom",
    "roomDiningRoom",
    "paywallMarbleKitchen",
    "homeKitchen",
  ]),
  makeGroup("attic", "Attic", "interior", [
    "homeAtticAfter",
    "livingGrand",
    "livingEditorial",
    "homeLibrary",
    "homeStudy",
    "homeHomeTheater",
    "roomHomeTheater",
  ]),
  makeGroup("toilet", "Toilet", "interior", [
    "homeToiletAfter",
    "wallVeinedMarble",
    "homeToiletAfter",
    "homeBathroomAfter",
    "homeBathroom",
    "roomBathroom",
    "wallLavenderMistBath",
    "wallSagePlaster",
  ]),
  makeGroup("balcony", "Balcony", "interior", [
    "homeBalconyAfter",
    "gardenTerrace",
    "gardenSunsetLounge",
    "gardenVillaEntry",
    "homeBalconyAfter",
    "gardenDeck",
    "gardenFrontYard",
    "gardenSpaDeck",
  ]),
  makeGroup("hall", "Hall", "interior", [
    "homeHallAfter",
    "livingGrand",
    "paywallLuxuryLounge",
    "homeHallAfter",
    "homeHall",
    "roomHall",
    "homeLibrary",
    "roomDiningRoom",
  ]),
  makeGroup("deck", "Deck", "interior", [
    "gardenSunsetLounge",
    "gardenFiresidePatio",
    "gardenTerrace",
    "homeDeckAfter",
    "gardenSpaDeck",
    "gardenDeck",
    "gardenPoolCourtyard",
  ]),
];

const GARDEN_GROUPS: DiscoverGroup[] = [
  makeGroup("landscape-designs", "Landscape Designs", "garden", [
    "paywallGardenPool",
    "gardenAfterInfinityPool",
    "gardenAfterWaterfallCourt",
    "gardenAfterTropicalPool",
    "gardenAfterFirePit",
    "gardenAfterGardenWalk",
    "gardenSunsetLounge",
  ]),
];

const EXTERIOR_GROUPS: DiscoverGroup[] = [
  makeGroup("villa", "Villa", "exterior", [
    "exteriorModernVilla",
    "exteriorAfterVilla",
    "exteriorPoolHouse",
    "exteriorStoneManor",
    "exteriorAfterHouseNight",
    "exampleExteriorOvergrown",
    "exampleExteriorWeathered",
  ]),
  makeGroup("apartment", "Apartment", "exterior", [
    "exteriorAfterApartment",
    "exteriorApartmentBlock",
    "exteriorPremiumGarage",
    "exteriorAfterApartment",
    "exteriorApartmentBlock",
    "exteriorGarageSuite",
    "exampleExteriorConcreteFrame",
    "exampleExteriorBrickShell",
  ]),
  makeGroup("house", "House", "exterior", [
    "exteriorAfterHouseNight",
    "exteriorAfterHouseDay",
    "exteriorStoneManor",
    "exteriorAfterHouseDay",
    "exteriorGarageSuite",
    "exteriorPremiumGarage",
    "exampleExteriorWeathered",
    "exampleExteriorOvergrown",
  ]),
  makeGroup("office-building", "Office Building", "exterior", [
    "exteriorAfterOffice",
    "exteriorGlassOffice",
    "exteriorAfterOffice",
    "exteriorGlassOffice",
    "exteriorRetailStorefront",
    "exteriorPremiumGarage",
    "exteriorRetailStore",
    "exampleExteriorConcreteFrame",
    "exampleExteriorBrickShell",
  ]),
  makeGroup("retail", "Retail", "exterior", [
    "exteriorRetailStorefront",
    "exteriorRetailStore",
    "exteriorAfterOffice",
    "exteriorRetailStorefront",
    "exteriorRetailStore",
    "exteriorGlassOffice",
    "exteriorPremiumGarage",
    "exampleExteriorAbandoned",
    "exampleExteriorBrickShell",
  ]),
  makeGroup("residential", "Residential", "exterior", [
    "exteriorPoolHouse",
    "exteriorAfterApartment",
    "exteriorAfterHouseNight",
    "exteriorApartmentBlock",
    "exteriorGarageSuite",
    "exampleExteriorWeathered",
    "exampleExteriorScaffold",
  ]),
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
