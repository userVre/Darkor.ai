import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

type StyleItem = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  image: string;
};

const STYLES_GALLERY: StyleItem[] = [
  {
    id: "modern",
    title: "Modern",
    emoji: "??",
    description: "Clean architectural lines with premium materials.",
    image: "/media/style-modern.jpg",
  },
  {
    id: "minimalist",
    title: "Minimalist",
    emoji: "??",
    description: "Simple forms, calm palette, and uncluttered harmony.",
    image: "/media/style-minimalist.jpg",
  },
  {
    id: "scandinavian",
    title: "Scandinavian",
    emoji: "??",
    description: "Soft light, natural textures, and cozy balance.",
    image: "/media/style-scandinavian.jpg",
  },
  {
    id: "industrial",
    title: "Industrial",
    emoji: "??",
    description: "Raw finishes, steel accents, and urban edge.",
    image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "zen",
    title: "Zen",
    emoji: "??",
    description: "Serene composition and mindful spatial flow.",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "coastal",
    title: "Coastal",
    emoji: "??",
    description: "Bright, airy rooms with relaxed seaside mood.",
    image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "art-deco",
    title: "Art Deco",
    emoji: "?",
    description: "Geometric glamour and high-contrast sophistication.",
    image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "tropical",
    title: "Tropical",
    emoji: "??",
    description: "Lush foliage, warm tones, and resort elegance.",
    image: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "midcentury",
    title: "Midcentury",
    emoji: "??",
    description: "Retro silhouettes with timeless modern warmth.",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "bohemian",
    title: "Bohemian",
    emoji: "??",
    description: "Layered textiles, earthy colors, and creative spirit.",
    image: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "farmhouse",
    title: "Farmhouse",
    emoji: "??",
    description: "Rustic charm with modern comfort and warmth.",
    image: "https://images.unsplash.com/photo-1565183928294-7063f23ce0f8?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "japanese",
    title: "Japanese",
    emoji: "??",
    description: "Natural simplicity with refined minimal detail.",
    image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "biophilic",
    title: "Biophilic",
    emoji: "??",
    description: "Nature-first interiors with organic rhythm.",
    image: "https://images.unsplash.com/photo-1617103996702-96ff29b1c467?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "retro",
    title: "Retro",
    emoji: "??",
    description: "Playful vintage personality and nostalgic color.",
    image: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "glam",
    title: "Glam",
    emoji: "??",
    description: "Polished finishes, mirrors, and statement luxe.",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "rustic",
    title: "Rustic",
    emoji: "??",
    description: "Natural wood textures and cozy cabin atmosphere.",
    image: "https://images.unsplash.com/photo-1600566752734-8c2e0d8f5a76?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "mediterranean",
    title: "Mediterranean",
    emoji: "??",
    description: "Sun-washed surfaces and earthy coastal warmth.",
    image: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk",
    emoji: "??",
    description: "Neon accents and futuristic cinematic mood.",
    image: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "contemporary",
    title: "Contemporary",
    emoji: "??",
    description: "Current trends with elegant modern restraint.",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "luxury",
    title: "Luxury",
    emoji: "??",
    description: "High-end finishes and bespoke statement pieces.",
    image: "https://images.unsplash.com/photo-1617098900591-3f90928e8c54?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "japandi",
    title: "Japandi",
    emoji: "??",
    description: "Nordic function and Japanese calm in one.",
    image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "classic",
    title: "Classic",
    emoji: "???",
    description: "Symmetry, heritage details, and timeless poise.",
    image: "https://images.unsplash.com/photo-1616593969747-4797dc75033e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "eclectic",
    title: "Eclectic",
    emoji: "??",
    description: "Curated contrast with bold character.",
    image: "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "wabi-sabi",
    title: "Wabi-Sabi",
    emoji: "??",
    description: "Organic imperfection and quiet authenticity.",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?auto=format&fit=crop&w=1200&q=80",
  },
];

export default function StyleGallery() {
  const [expanded, setExpanded] = useState(false);

  const visibleStyles = useMemo(
    () => (expanded ? STYLES_GALLERY : STYLES_GALLERY.slice(0, 8)),
    [expanded],
  );

  return (
    <View className="mx-auto w-full px-5 py-10">
      <View className="mb-8 items-center">
        <Text className="text-center text-3xl font-black text-white">Explore 24 Signature Styles</Text>
        <Text className="mt-3 text-center text-zinc-400">
          Create premium interiors in seconds across 24 distinct looks, from Industrial and Zen to Glam and Cyberpunk.
        </Text>
      </View>

      <View className="flex-row flex-wrap justify-between">
        {visibleStyles.map((style) => (
          <View
            key={style.id}
            className="mb-4 w-[48%] overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60"
          >
            <Image source={{ uri: style.image }} className="h-32 w-full" resizeMode="cover" />
            <View className="p-4">
              <Text className="text-base font-bold text-white">{style.title}</Text>
              <Text className="mt-1 text-sm text-zinc-400">{style.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="mt-6 items-center">
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5"
        >
          <Text className="text-sm font-semibold text-zinc-100">{expanded ? "Show less" : "View all styles"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
