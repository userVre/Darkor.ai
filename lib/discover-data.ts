export type DiscoverCategory = "Home" | "Exterior" | "Garden";

export type DiscoverItem = {
  id: string;
  title: string;
  style: string;
  category: DiscoverCategory;
  query: string;
  image: string | number;
  height: number;
};

const HEIGHTS = [220, 280, 260, 320, 240, 300];

type RawDiscoverItem = Omit<DiscoverItem, "id" | "height" | "image"> & {
  image?: string | number;
};

const RAW_ITEMS: readonly RawDiscoverItem[] = [
  {
    title: "Kitchen",
    style: "Marble Luxe",
    category: "Home",
    query: "kitchen,interior,luxury",
    image: require("../assets/media/rooms/room-kitchen.jpg"),
  },
  {
    title: "Living Room",
    style: "Modern Luxury",
    category: "Home",
    query: "living-room,interior,modern",
    image: require("../assets/media/rooms/room-living-room.jpg"),
  },
  {
    title: "Master Suite",
    style: "Hotel Luxe",
    category: "Home",
    query: "master-bedroom,luxury",
    image: require("../assets/media/rooms/room-master-suite.jpg"),
  },
  {
    title: "Bathroom",
    style: "Spa Marble",
    category: "Home",
    query: "bathroom,spa,luxury",
    image: require("../assets/media/rooms/room-bathroom.jpg"),
  },
  {
    title: "Home Office",
    style: "Executive Suite",
    category: "Home",
    query: "home-office,luxury,wood",
    image: require("../assets/media/rooms/room-home-office.jpg"),
  },
  {
    title: "Dining Room",
    style: "Formal Glow",
    category: "Home",
    query: "dining-room,luxury,classic",
    image: require("../assets/media/rooms/room-dining-room.jpg"),
  },
  {
    title: "Nursery",
    style: "Soft Elegance",
    category: "Home",
    query: "nursery,luxury,soft",
    image: require("../assets/media/rooms/room-nursery.jpg"),
  },
  {
    title: "Home Theater",
    style: "Cinematic",
    category: "Home",
    query: "home-theater,luxury,dark",
    image: require("../assets/media/rooms/room-home-theater.jpg"),
  },
  {
    title: "Hall",
    style: "Grand Entrance",
    category: "Home",
    query: "hallway,luxury,classic",
    image: require("../assets/media/rooms/room-hall.jpg"),
  },
  { title: "Modern House", style: "Glass Facade", category: "Exterior", query: "modern-house,exterior" },
  { title: "Luxury Villa", style: "Mediterranean", category: "Exterior", query: "villa,mediterranean" },
  { title: "Apartment Block", style: "Urban Minimal", category: "Exterior", query: "apartment-building,modern" },
  { title: "Retail Store", style: "Boutique", category: "Exterior", query: "retail-store,modern" },
  { title: "Garage", style: "Contemporary", category: "Exterior", query: "garage,modern" },
  { title: "Modern House", style: "Dark Minimal", category: "Exterior", query: "modern-house,black" },
  { title: "Luxury Villa", style: "Resort", category: "Exterior", query: "luxury-villa,resort" },
  { title: "Apartment Block", style: "Concrete Chic", category: "Exterior", query: "apartment-block,concrete" },
  { title: "Backyard", style: "Outdoor Lounge", category: "Garden", query: "backyard,landscape" },
  { title: "Front Yard", style: "Modern Garden", category: "Garden", query: "front-yard,landscape" },
  { title: "Patio", style: "Sunset Terrace", category: "Garden", query: "patio,outdoor" },
  { title: "Swimming Pool", style: "Tropical Resort", category: "Garden", query: "pool,backyard" },
  { title: "Terrace", style: "Skyline", category: "Garden", query: "terrace,city-view" },
  { title: "Deck", style: "Timber Retreat", category: "Garden", query: "deck,outdoor" },
  { title: "Backyard", style: "Firepit Luxe", category: "Garden", query: "backyard,firepit" },
  { title: "Patio", style: "Minimal Lounge", category: "Garden", query: "patio,minimal" },
  { title: "Terrace", style: "Evening Glow", category: "Garden", query: "terrace,evening" },
  { title: "Swimming Pool", style: "Villa Escape", category: "Garden", query: "pool,luxury" },
] as const;

export const DISCOVER_ITEMS: DiscoverItem[] = RAW_ITEMS.map((item, index) => ({
  ...item,
  id: `discover-${index}`,
  image: item.image ?? `https://source.unsplash.com/1600x2000/?${item.query}&sig=${index + 1}`,
  height: HEIGHTS[index % HEIGHTS.length],
}));
