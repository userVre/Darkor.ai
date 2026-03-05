"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const STYLES_GALLERY = [
  {
    id: "modern",
    name: "Modern",
    emoji: "🏠",
    description:
      "Clean silhouettes with bold architectural lines and open visual flow.\nBalanced textures keep the space sleek without feeling cold.",
    image: "https://source.unsplash.com/featured/?modern,interior,design",
  },
  {
    id: "luxury",
    name: "Luxury",
    emoji: "💎",
    description:
      "Premium finishes, statement lighting, and rich layered materials.\nEvery detail is curated for elegance and elevated comfort.",
    image: "https://source.unsplash.com/featured/?luxury,interior,living-room",
  },
  {
    id: "contemporary",
    name: "Contemporary",
    emoji: "🛋️",
    description:
      "Current trends blended with timeless proportions and neutral tones.\nSoft contrasts create a polished yet welcoming atmosphere.",
    image: "https://source.unsplash.com/featured/?contemporary,interior,home",
  },
  {
    id: "scandinavian",
    name: "Scandinavian",
    emoji: "🌿",
    description:
      "Light woods, bright palettes, and functional minimal furniture.\nNatural light and simplicity drive calm daily living.",
    image: "https://source.unsplash.com/featured/?scandinavian,interior,apartment",
  },
  {
    id: "minimalist",
    name: "Minimalist",
    emoji: "⚪",
    description:
      "Intentional spacing and uncluttered surfaces for visual clarity.\nFewer pieces, stronger impact, and effortless serenity.",
    image: "https://source.unsplash.com/featured/?minimalist,interior,room",
  },
  {
    id: "midcentury-modern",
    name: "Midcentury modern",
    emoji: "🪑",
    description:
      "Iconic forms, warm wood tones, and retro-modern character.\nA perfect balance between nostalgia and fresh sophistication.",
    image: "https://source.unsplash.com/featured/?midcentury,modern,interior",
  },
  {
    id: "bohemian",
    name: "Bohemian",
    emoji: "🎨",
    description:
      "Eclectic layers of textiles, patterns, and handcrafted accents.\nCreative freedom turns every corner into a story.",
    image: "https://source.unsplash.com/featured/?bohemian,interior,decor",
  },
  {
    id: "industrial",
    name: "Industrial",
    emoji: "🧱",
    description:
      "Raw concrete, exposed metals, and loft-inspired spatial drama.\nUrban grit meets refined furniture for bold character.",
    image: "https://source.unsplash.com/featured/?industrial,interior,loft",
  },
  {
    id: "tropical",
    name: "Tropical",
    emoji: "🌴",
    description:
      "Lush greenery, airy layouts, and breezy natural textures.\nSun-kissed palettes bring vacation energy into everyday spaces.",
    image: "https://source.unsplash.com/featured/?tropical,interior,home",
  },
  {
    id: "coastal",
    name: "Coastal",
    emoji: "🌊",
    description:
      "Soft blues, sandy neutrals, and relaxed seaside-inspired finishes.\nThe mood is fresh, light, and quietly rejuvenating.",
    image: "https://source.unsplash.com/featured/?coastal,interior,design",
  },
  {
    id: "rustic",
    name: "Rustic",
    emoji: "🪵",
    description:
      "Weathered wood, stone textures, and handcrafted warmth throughout.\nComfort-first spaces feel grounded and deeply inviting.",
    image: "https://source.unsplash.com/featured/?rustic,interior,cabin",
  },
  {
    id: "zen",
    name: "Zen",
    emoji: "🧘",
    description:
      "Muted palettes and uncluttered forms inspired by mindful living.\nTranquility and balance shape every material choice.",
    image: "https://source.unsplash.com/featured/?zen,interior,room",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    emoji: "🌐",
    description:
      "Neon accents, dark contrasts, and futuristic tech-forward mood.\nCinematic lighting creates high-energy immersive spaces.",
    image: "https://source.unsplash.com/featured/?cyberpunk,interior,neon",
  },
  {
    id: "art-deco",
    name: "Art Deco",
    emoji: "✨",
    description:
      "Geometric motifs, metallic details, and glamorous symmetry.\nA bold, theatrical look with timeless luxury undertones.",
    image: "https://source.unsplash.com/featured/?art,deco,interior",
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    emoji: "🌀",
    description:
      "Pastel gradients, surreal retro-futuristic accents, and mood lighting.\nA dreamy aesthetic blending nostalgia and digital fantasy.",
    image: "https://source.unsplash.com/featured/?vaporwave,interior,room",
  },
  {
    id: "sketch",
    name: "Sketch",
    emoji: "✏️",
    description:
      "Conceptual monochrome styling inspired by architectural drafts.\nGreat for pre-visualization and rapid ideation workflows.",
    image: "https://source.unsplash.com/featured/?interior,sketch,architecture",
  },
] as const;

const sectionReveal = {
  initial: { opacity: 0, y: 50, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.15 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

const gridStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function StyleGallery() {
  return (
    <motion.section
      id="gallery"
      className="mx-auto w-full max-w-7xl px-6 py-24"
      {...sectionReveal}
    >
      <div className="mx-auto mb-12 max-w-4xl text-center">
        <h2 className="text-4xl font-black text-white sm:text-5xl">Choose from 55+ interior design styles</h2>
        <p className="mt-4 text-zinc-400">
          With Darkor.ai&apos;s preset interior design styles, you don&apos;t need to do any of the hard work of writing
          prompts or setting parameters. Instead, with just one click, Darkor AI designs with your style in mind.
        </p>
        <p className="mt-3 bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text font-semibold text-transparent">
          All styles are included in your membership! You can try as many as you want.
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
        variants={gridStagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
      >
        {STYLES_GALLERY.map((style) => (
          <motion.article
            key={style.id}
            variants={cardReveal}
            className="group overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-zinc-800 hover:shadow-2xl hover:shadow-purple-500/10"
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
            <div className="p-5">
              <h3 className="text-lg font-bold text-white">
                <span className="mr-2" aria-hidden>
                  {style.emoji}
                </span>
                {style.name}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{style.description}</p>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </motion.section>
  );
}
