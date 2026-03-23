export type DiscoverSectionId = "home" | "garden" | "exterior";
export type DiscoverService = "interior" | "garden" | "exterior";

export type DiscoverTile = {
  id: string;
  title: string;
  subtitle: string;
  spaceType: string;
  style: string;
  service: DiscoverService;
  image: number;
};

export type DiscoverSection = {
  id: DiscoverSectionId;
  title: string;
  items: DiscoverTile[];
};

export const DISCOVER_SECTIONS: DiscoverSection[] = [
  {
    id: "home",
    title: "Home",
    items: [
      {
        id: "home-kitchen",
        title: "Marble Kitchen",
        subtitle: "Kitchen / Modern",
        spaceType: "Kitchen",
        style: "Modern",
        service: "interior",
        image: require("../assets/media/discover/home/home-kitchen.jpg"),
      },
      {
        id: "home-living-room",
        title: "Everyday Living",
        subtitle: "Living Room / Luxury",
        spaceType: "Living Room",
        style: "Luxury",
        service: "interior",
        image: require("../assets/media/discover/home/home-living-room.jpg"),
      },
      {
        id: "home-master-suite",
        title: "Serene Suite",
        subtitle: "Bedroom / Minimalist",
        spaceType: "Bedroom",
        style: "Minimalist",
        service: "interior",
        image: require("../assets/media/discover/home/home-master-suite.jpg"),
      },
      {
        id: "home-bathroom",
        title: "Spa Bathroom",
        subtitle: "Bathroom / Luxury",
        spaceType: "Bathroom",
        style: "Luxury",
        service: "interior",
        image: require("../assets/media/discover/home/home-bathroom.jpg"),
      },
      {
        id: "home-dining-room",
        title: "Formal Dining",
        subtitle: "Dining Room / Neo Classic",
        spaceType: "Dining Room",
        style: "Neo Classic",
        service: "interior",
        image: require("../assets/media/discover/home/home-dining-room.jpg"),
      },
      {
        id: "home-home-office",
        title: "Executive Office",
        subtitle: "Home Office / Modern",
        spaceType: "Home Office",
        style: "Modern",
        service: "interior",
        image: require("../assets/media/discover/home/home-home-office.jpg"),
      },
      {
        id: "home-home-theater",
        title: "Private Cinema",
        subtitle: "Home Theater / Cyberpunk",
        spaceType: "Home Theater",
        style: "Cyberpunk",
        service: "interior",
        image: require("../assets/media/discover/home/home-home-theater.jpg"),
      },
      {
        id: "home-library",
        title: "Collected Library",
        subtitle: "Library / Vintage",
        spaceType: "Library",
        style: "Vintage",
        service: "interior",
        image: require("../assets/media/discover/home/home-library.jpg"),
      },
    ],
  },
  {
    id: "garden",
    title: "Garden",
    items: [
      {
        id: "garden-backyard",
        title: "Backyard Retreat",
        subtitle: "Backyard / Mediterranean",
        spaceType: "Backyard",
        style: "Mediterranean",
        service: "garden",
        image: require("../assets/media/discover/garden/garden-backyard.jpg"),
      },
      {
        id: "garden-patio",
        title: "Firelit Patio",
        subtitle: "Patio / Rustic",
        spaceType: "Patio",
        style: "Rustic",
        service: "garden",
        image: require("../assets/media/discover/garden/garden-patio.jpg"),
      },
      {
        id: "garden-terrace",
        title: "Sunset Terrace",
        subtitle: "Terrace / Luxury",
        spaceType: "Terrace",
        style: "Luxury",
        service: "garden",
        image: require("../assets/media/discover/garden/garden-terrace.jpg"),
      },
      {
        id: "garden-swimming-pool",
        title: "Infinity Pool",
        subtitle: "Swimming Pool / Coastal",
        spaceType: "Swimming Pool",
        style: "Coastal",
        service: "garden",
        image: require("../assets/media/discover/garden/garden-swimming-pool.jpg"),
      },
      {
        id: "garden-front-yard",
        title: "Arrival Garden",
        subtitle: "Front yard / Modern",
        spaceType: "Front yard",
        style: "Modern",
        service: "garden",
        image: require("../assets/media/discover/garden/garden-front-yard.jpg"),
      },
      {
        id: "garden-deck",
        title: "Spa Deck",
        subtitle: "Deck / Japandi",
        spaceType: "Deck",
        style: "Japandi",
        service: "garden",
        image: require("../assets/media/discover/garden/garden-deck.jpg"),
      },
      {
        id: "garden-villa-entry",
        title: "Villa Courtyard",
        subtitle: "Pool Courtyard / Luxury",
        spaceType: "Pool Courtyard",
        style: "Luxury",
        service: "garden",
        image: require("../assets/media/discover/garden/garden-villa-entry.jpg"),
      },
      {
        id: "garden-sunset-lounge",
        title: "Golden Lounge",
        subtitle: "Sunset Lounge / Modern",
        spaceType: "Sunset Lounge",
        style: "Modern",
        service: "garden",
        image: require("../assets/media/discover/garden/garden-sunset-lounge.jpg"),
      },
    ],
  },
  {
    id: "exterior",
    title: "Exterior",
    items: [
      {
        id: "exterior-modern-villa",
        title: "Modern House",
        subtitle: "Modern House / Modern",
        spaceType: "Modern House",
        style: "Modern",
        service: "exterior",
        image: require("../assets/media/discover/exterior/exterior-modern-villa.jpg"),
      },
      {
        id: "exterior-pool-house",
        title: "Luxury Villa",
        subtitle: "Luxury Villa / Luxury",
        spaceType: "Luxury Villa",
        style: "Luxury",
        service: "exterior",
        image: require("../assets/media/discover/exterior/exterior-pool-house.jpg"),
      },
      {
        id: "exterior-retail-store",
        title: "Retail Frontage",
        subtitle: "Retail Store / Brutalist",
        spaceType: "Retail Store",
        style: "Brutalist",
        service: "exterior",
        image: require("../assets/media/discover/exterior/exterior-retail-store.jpg"),
      },
      {
        id: "exterior-apartment-block",
        title: "Urban Apartments",
        subtitle: "Apartment Block / Modern",
        spaceType: "Apartment Block",
        style: "Modern",
        service: "exterior",
        image: require("../assets/media/discover/exterior/exterior-apartment-block.jpg"),
      },
      {
        id: "exterior-glass-office",
        title: "Glass Office",
        subtitle: "Office Building / Minimalist",
        spaceType: "Office Building",
        style: "Minimalist",
        service: "exterior",
        image: require("../assets/media/discover/exterior/exterior-glass-office.jpg"),
      },
      {
        id: "exterior-stone-manor",
        title: "Stone Manor",
        subtitle: "Luxury Villa / Mediterranean",
        spaceType: "Luxury Villa",
        style: "Mediterranean",
        service: "exterior",
        image: require("../assets/media/discover/exterior/exterior-stone-manor.jpg"),
      },
      {
        id: "exterior-garage-suite",
        title: "Garage Studio",
        subtitle: "Garage / Minimalist",
        spaceType: "Garage",
        style: "Minimalist",
        service: "exterior",
        image: require("../assets/media/discover/exterior/exterior-garage-suite.jpg"),
      },
    ],
  },
];
