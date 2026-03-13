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

const RAW_ITEMS = [
  { title: "Living Room", style: "Modern Luxury", category: "Home", query: "living-room,interior,modern" },
  { title: "Kitchen", style: "Minimalist", category: "Home", query: "kitchen,interior,minimal" },
  { title: "Dining Room", style: "Scandinavian", category: "Home", query: "dining-room,scandinavian" },
  { title: "Bedroom", style: "Japandi Calm", category: "Home", query: "bedroom,japandi" },
  { title: "Home Office", style: "Industrial Loft", category: "Home", query: "home-office,industrial" },
  { title: "Bathroom", style: "Spa Zen", category: "Home", query: "bathroom,zen" },
  { title: "Nursery", style: "Soft Pastel", category: "Home", query: "nursery,interior,pastel" },
  { title: "Home Theater", style: "Cinematic", category: "Home", query: "home-theater,interior" },
  { title: "Gaming Room", style: "Cyberpunk", category: "Home", query: "gaming-room,cyberpunk" },
  { title: "Master Suite", style: "Hotel Luxe", category: "Home", query: "master-bedroom,luxury" },
  { title: "Study Room", style: "Classic", category: "Home", query: "study-room,classic" },
  { title: "Hall", style: "Art Deco", category: "Home", query: "hallway,art-deco" },
  { title: "Living Room", style: "Coastal Breeze", category: "Home", query: "living-room,coastal" },
  { title: "Kitchen", style: "Neo Classic", category: "Home", query: "kitchen,neo-classic" },
  { title: "Dining Room", style: "Rustic", category: "Home", query: "dining-room,rustic" },
  { title: "Bedroom", style: "Bohemian", category: "Home", query: "bedroom,bohemian" },
  { title: "Home Office", style: "Midcentury", category: "Home", query: "home-office,midcentury" },
  { title: "Bathroom", style: "Brutalist", category: "Home", query: "bathroom,brutalist" },
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
  // Replace with a local asset require(...) or a permanent URL anytime.
  image: `https://source.unsplash.com/1600x2000/?${item.query}&sig=${index + 1}`,
  height: HEIGHTS[index % HEIGHTS.length],
}));
