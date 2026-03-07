"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

type StyleItem = {
  id: string;
  name: string;
  icon: string;
  description: string;
  image: string;
};

const STYLES_GALLERY: StyleItem[] = [
  { id: "modern", name: "Modern", icon: "MOD", description: "Clean geometry with timeless sophistication.", image: "https://images.unsplash.com/photo-1616594039964-3f9f4a6cc7f3?auto=format&fit=crop&w=1200&q=80" },
  { id: "luxury", name: "Luxury", icon: "LUX", description: "Premium finishes and statement details.", image: "https://images.unsplash.com/photo-1617098900591-3f90928e8c54?auto=format&fit=crop&w=1200&q=80" },
  { id: "contemporary", name: "Contemporary", icon: "CON", description: "Current trends with polished minimal lines.", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80" },
  { id: "scandinavian", name: "Scandinavian", icon: "SCA", description: "Light wood warmth and soft natural calm.", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?auto=format&fit=crop&w=1200&q=80" },
  { id: "minimalist", name: "Minimalist", icon: "MIN", description: "Pure forms, uncluttered surfaces, visual clarity.", image: "https://images.unsplash.com/photo-1617104551722-3b2d51366497?auto=format&fit=crop&w=1200&q=80" },
  { id: "midcentury", name: "Midcentury", icon: "MID", description: "Retro silhouettes with warm modern balance.", image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80" },
  { id: "bohemian", name: "Bohemian", icon: "BOH", description: "Eclectic textures and artistic layered comfort.", image: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80" },
  { id: "farmhouse", name: "Farmhouse", icon: "FRM", description: "Rustic charm with modern comfort.", image: "https://images.unsplash.com/photo-1565183928294-7063f23ce0f8?auto=format&fit=crop&w=1200&q=80" },
  { id: "industrial", name: "Industrial", icon: "IND", description: "Raw materials and loft-inspired character.", image: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=80" },
  { id: "zen", name: "Zen", icon: "ZEN", description: "Serene tones and mindful spatial balance.", image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80" },
  { id: "coastal", name: "Coastal", icon: "SEA", description: "Airy palette with breezy seaside vibes.", image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=80" },
  { id: "artdeco", name: "Art Deco", icon: "ART", description: "Bold glamour and geometric elegance.", image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80" },
  { id: "tropical", name: "Tropical", icon: "TRP", description: "Lush greenery and sunlit resort energy.", image: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80" },
  { id: "japandi", name: "Japandi", icon: "JPN", description: "Japanese calm meets Nordic utility.", image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80" },
  { id: "classic", name: "Classic", icon: "CLS", description: "Refined symmetry and timeless tradition.", image: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?auto=format&fit=crop&w=1200&q=80" },
  { id: "eclectic", name: "Eclectic", icon: "ECL", description: "Curated contrast with expressive personality.", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80" },
  { id: "mediterranean", name: "Mediterranean", icon: "MED", description: "Earthy plaster textures and warm light.", image: "https://images.unsplash.com/photo-1600566752734-8c2e0d8f5a76?auto=format&fit=crop&w=1200&q=80" },
  { id: "maximalist", name: "Maximalist", icon: "MAX", description: "Bold color stories and rich layering.", image: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80" },
  { id: "retro", name: "Retro", icon: "RET", description: "Vintage attitude with playful nostalgia.", image: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80" },
  { id: "traditional", name: "Traditional", icon: "TRD", description: "Heritage forms and cozy familiar warmth.", image: "https://images.unsplash.com/photo-1616593969747-4797dc75033e?auto=format&fit=crop&w=1200&q=80" },
  { id: "biophilic", name: "Biophilic", icon: "BIO", description: "Nature-forward spaces with organic rhythm.", image: "https://images.unsplash.com/photo-1617103996702-96ff29b1c467?auto=format&fit=crop&w=1200&q=80" },
  { id: "french", name: "French Chic", icon: "FR", description: "Parisian elegance with modern softness.", image: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1200&q=80" },
  { id: "wabisabi", name: "Wabi-Sabi", icon: "WS", description: "Imperfect textures and quiet authenticity.", image: "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=1200&q=80" },
  { id: "future", name: "Future Loft", icon: "FTR", description: "Futuristic lighting and immersive geometry.", image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80" },
];

const sectionReveal = {
  initial: { opacity: 0, y: 50, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.15 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

const gridStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 24, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function StyleGallery() {
  const [showAll, setShowAll] = useState(false);
  const visibleCards = useMemo(() => (showAll ? STYLES_GALLERY : STYLES_GALLERY.slice(0, 12)), [showAll]);

  return (
    <motion.section id="gallery" className="mx-auto w-full max-w-7xl px-6 py-24" {...sectionReveal}>
      <div className="mx-auto mb-12 max-w-4xl text-center">
        <h2 className="text-4xl font-black text-white sm:text-5xl">Explore 24 signature design styles</h2>
        <p className="mt-4 text-zinc-400">
          From Farmhouse and Industrial to Zen and Art Deco, Darkor.ai lets you redesign every room with premium style accuracy.
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
        variants={gridStagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
      >
        {visibleCards.map((style) => (
          <motion.article
            key={style.id}
            variants={cardReveal}
            whileHover={{ y: -4 }}
            className="group overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60 transition-all duration-300 hover:border-fuchsia-300/40 hover:shadow-2xl hover:shadow-fuchsia-500/15"
          >
            <div className="relative h-56 overflow-hidden rounded-t-2xl">
              <Image
                src={style.image}
                alt={`${style.name} interior style`}
                fill
                className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
              />
            </div>
            <div className="space-y-2 p-5">
              <h3 className="text-lg font-bold text-white">
                <span className="mr-2 inline-flex rounded-md border border-fuchsia-300/40 bg-fuchsia-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-200">
                  {style.icon}
                </span>
                {style.name}
              </h3>
              <p className="text-sm text-zinc-400">{style.description}</p>
            </div>
          </motion.article>
        ))}
      </motion.div>

      {!showAll ? (
        <div className="mt-10 text-center">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setShowAll(true)}
            className="cursor-pointer rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-fuchsia-300/40 hover:text-white"
          >
            View all styles
          </motion.button>
        </div>
      ) : null}
    </motion.section>
  );
}
