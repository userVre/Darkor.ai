export type DiscoverSectionId = "home" | "garden" | "exterior";
export type DiscoverService = "interior" | "garden" | "exterior";

export type DiscoverTile = {
  id: string;
  title: string;
  caption: string;
  spaceType: string;
  style: string;
  service: DiscoverService;
  image: number;
};

export type DiscoverShelf = {
  id: string;
  title: string;
  description: string;
  items: DiscoverTile[];
};

export type DiscoverSection = {
  id: DiscoverSectionId;
  eyebrow: string;
  title: string;
  description: string;
  shelves: DiscoverShelf[];
};

export const DISCOVER_SECTIONS: DiscoverSection[] = [
  {
    id: "home",
    eyebrow: "Home",
    title: "Interior Inspiration",
    description: "Room-by-room ideas curated from calm luxury spaces, ready to open directly in the redesign wizard.",
    shelves: [
      {
        id: "home-living",
        title: "Everyday Living",
        description: "Warm shared spaces with soft lighting and premium comfort.",
        items: [
          {
            id: "home-living-room",
            title: "Living Room",
            caption: "Layered lounge comfort",
            spaceType: "Living Room",
            style: "Luxury",
            service: "interior",
            image: require("../assets/media/discover/home/home-living-room.jpg"),
          },
          {
            id: "home-master-suite",
            title: "Master Suite",
            caption: "Hotel-grade serenity",
            spaceType: "Bedroom",
            style: "Minimalist",
            service: "interior",
            image: require("../assets/media/discover/home/home-master-suite.jpg"),
          },
          {
            id: "home-nursery",
            title: "Nursery",
            caption: "Soft family retreat",
            spaceType: "Nursery",
            style: "Japandi",
            service: "interior",
            image: require("../assets/media/discover/home/home-nursery.jpg"),
          },
        ],
      },
      {
        id: "home-culinary",
        title: "Culinary Spaces",
        description: "Polished kitchens and dining zones with clean luxury lines.",
        items: [
          {
            id: "home-kitchen",
            title: "Kitchen",
            caption: "Marble centerpiece",
            spaceType: "Kitchen",
            style: "Modern",
            service: "interior",
            image: require("../assets/media/discover/home/home-kitchen.jpg"),
          },
          {
            id: "home-dining-room",
            title: "Dining Room",
            caption: "Formal entertaining glow",
            spaceType: "Dining Room",
            style: "Luxury",
            service: "interior",
            image: require("../assets/media/discover/home/home-dining-room.jpg"),
          },
          {
            id: "home-laundry",
            title: "Laundry",
            caption: "Utility, elevated",
            spaceType: "Laundry",
            style: "Scandinavian",
            service: "interior",
            image: require("../assets/media/discover/home/home-laundry.jpg"),
          },
        ],
      },
      {
        id: "home-focus",
        title: "Focused Work",
        description: "Executive corners, studies, and library-inspired rooms.",
        items: [
          {
            id: "home-home-office",
            title: "Home Office",
            caption: "Executive desk setup",
            spaceType: "Home Office",
            style: "Modern",
            service: "interior",
            image: require("../assets/media/discover/home/home-home-office.jpg"),
          },
          {
            id: "home-study",
            title: "Gaming Room",
            caption: "Immersive setup zone",
            spaceType: "Gaming Room",
            style: "Cyberpunk",
            service: "interior",
            image: require("../assets/media/discover/home/home-gaming-room.jpg"),
          },
          {
            id: "home-library",
            title: "Library",
            caption: "Collected moody warmth",
            spaceType: "Library",
            style: "Vintage",
            service: "interior",
            image: require("../assets/media/discover/home/home-library.jpg"),
          },
        ],
      },
      {
        id: "home-signature",
        title: "Signature Corners",
        description: "Special rooms with cinematic atmosphere and architectural flow.",
        items: [
          {
            id: "home-bathroom",
            title: "Bathroom",
            caption: "Spa marble calm",
            spaceType: "Bathroom",
            style: "Luxury",
            service: "interior",
            image: require("../assets/media/discover/home/home-bathroom.jpg"),
          },
          {
            id: "home-home-theater",
            title: "Home Theater",
            caption: "Private cinema mood",
            spaceType: "Home Theater",
            style: "Cyberpunk",
            service: "interior",
            image: require("../assets/media/discover/home/home-home-theater.jpg"),
          },
          {
            id: "home-hall",
            title: "Hall",
            caption: "Grand arrival sequence",
            spaceType: "Hall",
            style: "Mediterranean",
            service: "interior",
            image: require("../assets/media/discover/home/home-hall.jpg"),
          },
        ],
      },
    ],
  },
  {
    id: "garden",
    eyebrow: "Garden",
    title: "Outdoor Living",
    description: "Poolside layouts, fire features, and sunset lounges tuned for exterior transformations.",
    shelves: [
      {
        id: "garden-resort",
        title: "Resort Energy",
        description: "Statement pools and dramatic villa entries with premium landscaping.",
        items: [
          {
            id: "garden-pool-courtyard",
            title: "Backyard",
            caption: "Firepit-centered gathering",
            spaceType: "Backyard",
            style: "Mediterranean",
            service: "garden",
            image: require("../assets/media/discover/garden/garden-backyard.jpg"),
          },
          {
            id: "garden-villa-entry",
            title: "Front yard",
            caption: "Layered landscape arrival",
            spaceType: "Front yard",
            style: "Modern",
            service: "garden",
            image: require("../assets/media/discover/garden/garden-front-yard.jpg"),
          },
          {
            id: "garden-infinity-pool",
            title: "Swimming Pool",
            caption: "Waterline horizon",
            spaceType: "Swimming Pool",
            style: "Coastal",
            service: "garden",
            image: require("../assets/media/discover/garden/garden-swimming-pool.jpg"),
          },
        ],
      },
      {
        id: "garden-lounge",
        title: "Open-Air Lounges",
        description: "Golden-hour seating zones with decks, patios, and spa moments.",
        items: [
          {
            id: "garden-fireside-patio",
            title: "Patio",
            caption: "Covered conversation zone",
            spaceType: "Patio",
            style: "Rustic",
            service: "garden",
            image: require("../assets/media/discover/garden/garden-patio.jpg"),
          },
          {
            id: "garden-sunset-lounge",
            title: "Terrace",
            caption: "Terrace with glow",
            spaceType: "Terrace",
            style: "Luxury",
            service: "garden",
            image: require("../assets/media/discover/garden/garden-terrace.jpg"),
          },
          {
            id: "garden-spa-deck",
            title: "Deck",
            caption: "Private soak retreat",
            spaceType: "Deck",
            style: "Japandi",
            service: "garden",
            image: require("../assets/media/discover/garden/garden-deck.jpg"),
          },
        ],
      },
    ],
  },
  {
    id: "exterior",
    eyebrow: "Exterior",
    title: "Architectural Facades",
    description: "Modern structures, villa silhouettes, and commercial facades with crisp material language.",
    shelves: [
      {
        id: "exterior-villas",
        title: "Signature Villas",
        description: "Residential exteriors with glass, stone, and strong geometric massing.",
        items: [
          {
            id: "exterior-modern-villa",
            title: "Modern House",
            caption: "Poolside residence",
            spaceType: "Modern House",
            style: "Modern",
            service: "exterior",
            image: require("../assets/media/discover/exterior/exterior-modern-villa.jpg"),
          },
          {
            id: "exterior-pool-house",
            title: "Luxury Villa",
            caption: "Luxury villa frontage",
            spaceType: "Luxury Villa",
            style: "Luxury",
            service: "exterior",
            image: require("../assets/media/discover/exterior/exterior-pool-house.jpg"),
          },
          {
            id: "exterior-stone-manor",
            title: "Luxury Villa Plus",
            caption: "Textured residential facade",
            spaceType: "Luxury Villa",
            style: "Mediterranean",
            service: "exterior",
            image: require("../assets/media/discover/exterior/exterior-stone-manor.jpg"),
          },
        ],
      },
      {
        id: "exterior-urban",
        title: "Urban Statements",
        description: "Commercial edges, apartment forms, and clean supporting structures.",
        items: [
          {
            id: "exterior-glass-office",
            title: "Retail Store",
            caption: "Commercial frontage",
            spaceType: "Retail Store",
            style: "Brutalist",
            service: "exterior",
            image: require("../assets/media/discover/exterior/exterior-retail-store.jpg"),
          },
          {
            id: "exterior-apartment-block",
            title: "Apartment Block",
            caption: "Layered balconies",
            spaceType: "Apartment Block",
            style: "Modern",
            service: "exterior",
            image: require("../assets/media/discover/exterior/exterior-apartment-block.jpg"),
          },
          {
            id: "exterior-garage-suite",
            title: "Garage",
            caption: "Utility facade upgrade",
            spaceType: "Garage",
            style: "Minimalist",
            service: "exterior",
            image: require("../assets/media/discover/exterior/exterior-garage-suite.jpg"),
          },
        ],
      },
    ],
  },
];
