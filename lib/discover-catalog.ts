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
  { id: "exterior", label: "Architecture" },
  { id: "garden", label: "Landscapes" },
] as const satisfies ReadonlyArray<{ id: DiscoverTabId; label: string }>;

const DISCOVER_IMAGES = {
  kitchenHero: require("../assets/media/discover/injected/home/kitchen.png"),
  kitchenAltA: require("../assets/media/discover/home/home-kitchen.jpg"),
  kitchenAltB: require("../assets/media/discover/wall-scenes/soft-ivory-kitchen.jpg"),
  kitchenAltC: require("../assets/media/paywall/paywall-marble-kitchen.png"),
  kitchenAltD: require("../assets/media/rooms/room-kitchen.jpg"),

  livingHero: require("../assets/media/discover/injected/home/living-room.png"),
  livingAltA: require("../assets/media/discover/home/interior-after-grand-salon.jpg"),
  livingAltB: require("../assets/media/discover/home/interior-after-editorial-lounge.jpg"),
  livingAltC: require("../assets/media/discover/home/interior-after-organic-living.jpg"),
  livingAltD: require("../assets/media/discover/home/home-living-room.jpg"),

  diningHero: require("../assets/media/discover/injected/home/dining-room.png"),
  diningAltA: require("../assets/media/discover/home/home-dining-room.jpg"),
  diningAltB: require("../assets/media/discover/wall-scenes/terracotta-dining.jpg"),
  diningAltC: require("../assets/media/paywall/paywall-dining-room.png"),
  diningAltD: require("../assets/media/rooms/room-dining-room.jpg"),

  bedroomHero: require("../assets/media/discover/injected/home/bedroom.png"),
  bedroomAltA: require("../assets/media/discover/home/home-master-suite.jpg"),
  bedroomAltB: require("../assets/media/discover/wall-scenes/midnight-navy-bedroom.jpg"),
  bedroomAltC: require("../assets/media/paywall/paywall-boho-bedroom.png"),
  bedroomAltD: require("../assets/media/rooms/room-master-suite.jpg"),

  bathroomHero: require("../assets/media/discover/injected/home/bathroom.png"),
  bathroomAltA: require("../assets/media/discover/home/home-bathroom.jpg"),
  bathroomAltB: require("../assets/media/discover/wall-scenes/lavender-mist-bath.jpg"),
  bathroomAltC: require("../assets/media/discover/wall-scenes/wall-after-veined-marble.jpg"),
  bathroomAltD: require("../assets/media/rooms/room-bathroom.jpg"),

  gamingHero: require("../assets/media/discover/injected/home/gaming-room.png"),
  gamingAltA: require("../assets/media/discover/home/home-gaming-room.jpg"),
  gamingAltB: require("../assets/media/discover/home/interior-after-moody-club.jpg"),
  gamingAltC: require("../assets/media/paywall/paywall-gaming-room.png"),
  gamingAltD: require("../assets/media/discover/home/home-home-theater.jpg"),

  homeOfficeHero: require("../assets/media/discover/injected/home/home-office.png"),
  homeOfficeAltA: require("../assets/media/discover/home/home-home-office.jpg"),
  homeOfficeAltB: require("../assets/media/discover/home/home-study.jpg"),
  homeOfficeAltC: require("../assets/media/discover/wall-scenes/deep-olive-study.jpg"),
  homeOfficeAltD: require("../assets/media/rooms/room-home-office.jpg"),

  coffeeHero: require("../assets/media/discover/injected/home/coffee-shop.png"),
  coffeeAltA: require("../assets/media/discover/home/interior-after-editorial-lounge.jpg"),
  coffeeAltB: require("../assets/media/discover/home/interior-after-organic-living.jpg"),
  coffeeAltC: require("../assets/media/paywall/paywall-soft-lounge.png"),
  coffeeAltD: require("../assets/media/discover/home/home-dining-room.jpg"),

  studyHero: require("../assets/media/discover/injected/home/study-room.png"),
  studyAltA: require("../assets/media/discover/home/home-study.jpg"),
  studyAltB: require("../assets/media/discover/home/home-library.jpg"),
  studyAltC: require("../assets/media/discover/wall-scenes/deep-olive-study.jpg"),
  studyAltD: require("../assets/media/examples/interior/interior-before-worn-reading-room.jpg"),

  restaurantHero: require("../assets/media/discover/injected/home/restaurant.png"),
  restaurantAltA: require("../assets/media/paywall/paywall-dining-room.png"),
  restaurantAltB: require("../assets/media/discover/home/home-dining-room.jpg"),
  restaurantAltC: require("../assets/media/discover/home/interior-after-grand-salon.jpg"),
  restaurantAltD: require("../assets/media/discover/home/home-kitchen.jpg"),

  atticHero: require("../assets/media/discover/injected/home/attic.png"),
  atticAltA: require("../assets/media/discover/home/home-library.jpg"),
  atticAltB: require("../assets/media/discover/home/interior-after-editorial-lounge.jpg"),
  atticAltC: require("../assets/media/discover/home/home-study.jpg"),
  atticAltD: require("../assets/media/discover/home/home-home-theater.jpg"),

  toiletHero: require("../assets/media/discover/injected/home/toilet.png"),
  toiletAltA: require("../assets/media/discover/home/home-bathroom.jpg"),
  toiletAltB: require("../assets/media/discover/wall-scenes/lavender-mist-bath.jpg"),
  toiletAltC: require("../assets/media/discover/wall-scenes/wall-after-veined-marble.jpg"),
  toiletAltD: require("../assets/media/rooms/room-bathroom.jpg"),

  balconyHero: require("../assets/media/discover/injected/home/balcony.png"),
  balconyAltA: require("../assets/media/discover/garden/garden-terrace.jpg"),
  balconyAltB: require("../assets/media/discover/garden/garden-sunset-lounge.jpg"),
  balconyAltC: require("../assets/media/discover/garden/garden-villa-entry.jpg"),
  balconyAltD: require("../assets/media/discover/garden/garden-spa-deck.jpg"),

  hallHero: require("../assets/media/discover/injected/home/hall.png"),
  hallAltA: require("../assets/media/discover/home/home-hall.jpg"),
  hallAltB: require("../assets/media/discover/home/interior-after-grand-salon.jpg"),
  hallAltC: require("../assets/media/paywall/paywall-luxury-lounge.png"),
  hallAltD: require("../assets/media/rooms/room-hall.jpg"),

  deckHero: require("../assets/media/discover/injected/home/deck.png"),
  deckAltA: require("../assets/media/discover/garden/garden-deck.jpg"),
  deckAltB: require("../assets/media/discover/garden/garden-fireside-patio.jpg"),
  deckAltC: require("../assets/media/discover/garden/garden-pool-courtyard.jpg"),
  deckAltD: require("../assets/media/discover/garden/garden-spa-deck.jpg"),

  wallHero: require("../assets/media/discover/wall-scenes/wall-after-sage-plaster.jpg"),
  wallAltA: require("../assets/media/discover/wall-scenes/wall-after-veined-marble.jpg"),
  wallAltB: require("../assets/media/discover/wall-scenes/wall-after-botanical-mural.jpg"),
  wallAltC: require("../assets/media/discover/wall-scenes/wall-after-linear-slats.jpg"),
  wallAltD: require("../assets/media/discover/wall-scenes/wall-after-minimal-concrete.jpg"),

  floorHero: require("../assets/media/discover/floor-scenes/floor-after-carrara-marble.jpg"),
  floorAltA: require("../assets/media/discover/floor-scenes/floor-after-walnut-gloss.jpg"),
  floorAltB: require("../assets/media/discover/floor-scenes/floor-after-soft-limestone.jpg"),
  floorAltC: require("../assets/media/discover/floor-scenes/floor-after-satin-concrete.jpg"),
  floorAltD: require("../assets/media/discover/floor-scenes/floor-after-heritage-herringbone.jpg"),

  villaHero: require("../assets/media/discover/exterior/exterior-after-stone-villa.jpg"),
  villaAltA: require("../assets/media/discover/exterior/exterior-modern-villa.jpg"),
  villaAltB: require("../assets/media/discover/exterior/exterior-stone-manor.jpg"),
  villaAltC: require("../assets/media/discover/exterior/exterior-after-modern-house-night.jpg"),
  villaAltD: require("../assets/media/discover/exterior/exterior-pool-house.jpg"),

  apartmentHero: require("../assets/media/discover/exterior/exterior-after-eco-apartments.jpg"),
  apartmentAltA: require("../assets/media/discover/exterior/exterior-apartment-block.jpg"),
  apartmentAltB: require("../assets/media/discover/exterior/exterior-premium-garage.jpg"),
  apartmentAltC: require("../assets/media/discover/exterior/exterior-garage-suite.jpg"),
  apartmentAltD: require("../assets/media/examples/exterior/exterior-before-concrete-frame.jpg"),

  houseHero: require("../assets/media/discover/exterior/exterior-after-modern-house-day.jpg"),
  houseAltA: require("../assets/media/discover/exterior/exterior-after-modern-house-night.jpg"),
  houseAltB: require("../assets/media/discover/exterior/exterior-pool-house.jpg"),
  houseAltC: require("../assets/media/discover/exterior/exterior-stone-manor.jpg"),
  houseAltD: require("../assets/media/examples/exterior/exterior-before-weathered-house.jpg"),

  officeBuildingHero: require("../assets/media/discover/exterior/exterior-after-glass-office.jpg"),
  officeBuildingAltA: require("../assets/media/discover/exterior/exterior-glass-office.jpg"),
  officeBuildingAltB: require("../assets/media/discover/exterior/exterior-retail-storefront.jpg"),
  officeBuildingAltC: require("../assets/media/discover/exterior/exterior-retail-store.jpg"),
  officeBuildingAltD: require("../assets/media/examples/exterior/exterior-before-brick-shell.jpg"),

  retailHero: require("../assets/media/discover/exterior/exterior-retail-storefront.jpg"),
  retailAltA: require("../assets/media/discover/exterior/exterior-retail-store.jpg"),
  retailAltB: require("../assets/media/discover/exterior/exterior-after-glass-office.jpg"),
  retailAltC: require("../assets/media/discover/exterior/exterior-glass-office.jpg"),
  retailAltD: require("../assets/media/examples/exterior/exterior-before-abandoned-home.jpg"),

  residentialHero: require("../assets/media/discover/exterior/exterior-pool-house.jpg"),
  residentialAltA: require("../assets/media/discover/exterior/exterior-after-eco-apartments.jpg"),
  residentialAltB: require("../assets/media/discover/exterior/exterior-after-modern-house-night.jpg"),
  residentialAltC: require("../assets/media/discover/exterior/exterior-apartment-block.jpg"),
  residentialAltD: require("../assets/media/examples/exterior/exterior-before-scaffold-house.jpg"),

  gardenHero: require("../assets/media/discover/garden/garden-after-infinity-pool.jpg"),
  gardenAltA: require("../assets/media/discover/garden/garden-after-luminous-garden-walk.jpg"),
  gardenAltB: require("../assets/media/discover/garden/garden-after-sunset-fire-pit.jpg"),
  gardenAltC: require("../assets/media/discover/garden/garden-after-tropical-pool-lounge.jpg"),
  gardenAltD: require("../assets/media/discover/garden/garden-after-waterfall-court.jpg"),
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
  makeGroup("kitchen", "Kitchen", "interior", ["kitchenHero", "kitchenAltA", "kitchenAltB", "kitchenAltC", "kitchenAltD"]),
  makeGroup("living-room", "Living Room", "interior", ["livingHero", "livingAltA", "livingAltB", "livingAltC", "livingAltD"]),
  makeGroup("dining-room", "Dining Room", "interior", ["diningHero", "diningAltA", "diningAltB", "diningAltC", "diningAltD"]),
  makeGroup("bedroom", "Bedroom", "interior", ["bedroomHero", "bedroomAltA", "bedroomAltB", "bedroomAltC", "bedroomAltD"]),
  makeGroup("bathroom", "Bathroom", "interior", ["bathroomHero", "bathroomAltA", "bathroomAltB", "bathroomAltC", "bathroomAltD"]),
  makeGroup("gaming-room", "Gaming Room", "interior", ["gamingHero", "gamingAltA", "gamingAltB", "gamingAltC", "gamingAltD"]),
  makeGroup("home-office", "Home Office", "interior", ["homeOfficeHero", "homeOfficeAltA", "homeOfficeAltB", "homeOfficeAltC", "homeOfficeAltD"]),
  makeGroup("coffee-shop", "Coffee Shop", "interior", ["coffeeHero", "coffeeAltA", "coffeeAltB", "coffeeAltC", "coffeeAltD"]),
  makeGroup("study-room", "Study Room", "interior", ["studyHero", "studyAltA", "studyAltB", "studyAltC", "studyAltD"]),
  makeGroup("restaurant", "Restaurant", "interior", ["restaurantHero", "restaurantAltA", "restaurantAltB", "restaurantAltC", "restaurantAltD"]),
  makeGroup("attic", "Attic", "interior", ["atticHero", "atticAltA", "atticAltB", "atticAltC", "atticAltD"]),
  makeGroup("toilet", "Toilet", "interior", ["toiletHero", "toiletAltA", "toiletAltB", "toiletAltC", "toiletAltD"]),
  makeGroup("balcony", "Balcony", "interior", ["balconyHero", "balconyAltA", "balconyAltB", "balconyAltC", "balconyAltD"]),
  makeGroup("hall", "Hall", "interior", ["hallHero", "hallAltA", "hallAltB", "hallAltC", "hallAltD"]),
  makeGroup("deck", "Deck", "interior", ["deckHero", "deckAltA", "deckAltB", "deckAltC", "deckAltD"]),
  makeGroup("wall", "Wall", "paint", ["wallHero", "wallAltA", "wallAltB", "wallAltC", "wallAltD"]),
  makeGroup("floor", "Floor", "floor", ["floorHero", "floorAltA", "floorAltB", "floorAltC", "floorAltD"]),
];

const EXTERIOR_GROUPS: DiscoverGroup[] = [
  makeGroup("villa", "Villa", "exterior", ["villaHero", "villaAltA", "villaAltB", "villaAltC", "villaAltD"]),
  makeGroup("apartment", "Apartment", "exterior", ["apartmentHero", "apartmentAltA", "apartmentAltB", "apartmentAltC", "apartmentAltD"]),
  makeGroup("house", "House", "exterior", ["houseHero", "houseAltA", "houseAltB", "houseAltC", "houseAltD"]),
  makeGroup("office-building", "Office Building", "exterior", ["officeBuildingHero", "officeBuildingAltA", "officeBuildingAltB", "officeBuildingAltC", "officeBuildingAltD"]),
  makeGroup("retail", "Retail", "exterior", ["retailHero", "retailAltA", "retailAltB", "retailAltC", "retailAltD"]),
  makeGroup("residential", "Residential", "exterior", ["residentialHero", "residentialAltA", "residentialAltB", "residentialAltC", "residentialAltD"]),
];

const GARDEN_GROUPS: DiscoverGroup[] = [
  makeGroup("garden", "Garden", "garden", ["gardenHero", "gardenAltA", "gardenAltB", "gardenAltC", "gardenAltD"]),
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
