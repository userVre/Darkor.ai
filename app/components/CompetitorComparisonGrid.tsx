"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle, Circle, Sparkles, XCircle } from "lucide-react";

type ItemState = "neutral" | "good" | "bad";

type ComparisonItem = {
  label: string;
  state: ItemState;
};

type ComparisonCard = {
  title: string;
  image: string;
  items: ComparisonItem[];
  isWinner?: boolean;
};

const cards: ComparisonCard[] = [
  {
    title: "A challenging input photo",
    image: "/media/before-empty-room.png",
    items: [
      { label: "Low resolution photo", state: "neutral" },
      { label: "Taken at an angle", state: "neutral" },
      { label: "Shiny textures", state: "neutral" },
      { label: "High depth details", state: "neutral" },
    ],
  },
  {
    title: "Darkor.ai",
    image: "/media/after-luxury-minimalist.png",
    isWinner: true,
    items: [
      { label: "Maintains construction", state: "good" },
      { label: "Clear and sharp", state: "good" },
      { label: "High photorealism", state: "good" },
      { label: "High resolution", state: "good" },
    ],
  },
  {
    title: "Decorify",
    image: "/media/after-boho-chic.png",
    items: [
      { label: "Changes construction", state: "bad" },
      { label: "Clear and sharp", state: "good" },
      { label: "High photorealism", state: "good" },
      { label: "High resolution", state: "good" },
    ],
  },
  {
    title: "AI Room Planner",
    image: "/media/after-cyberpunk.png",
    items: [
      { label: "Changes construction", state: "bad" },
      { label: "Blurry", state: "bad" },
      { label: "Not photorealistic", state: "bad" },
      { label: "Low resolution", state: "bad" },
    ],
  },
  {
    title: "RoomGPT",
    image: "/media/render-after.png",
    items: [
      { label: "Changes construction", state: "bad" },
      { label: "Blurry", state: "bad" },
      { label: "High photorealism", state: "good" },
      { label: "Low resolution", state: "bad" },
    ],
  },
  {
    title: "Dreamstudio",
    image: "/media/garden-empty.png",
    items: [
      { label: "Changes construction", state: "bad" },
      { label: "Sharp", state: "good" },
      { label: "Not photorealistic", state: "bad" },
      { label: "Distorted objects", state: "bad" },
    ],
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function FeatureIcon({ state }: { state: ItemState }) {
  if (state === "good") {
    return <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />;
  }

  if (state === "bad") {
    return <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />;
  }

  return <Circle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />;
}

export default function CompetitorComparisonGrid() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold text-white md:text-5xl">
          How does Darkor.ai compare to other AI interior designers?
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
          Darkor.ai preserves your room construction while delivering consistently sharp,
          photorealistic outputs with dependable resolution quality.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
        className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((card) => (
          <motion.article
            key={card.title}
            variants={cardVariants}
            className={`overflow-hidden rounded-2xl border ${
              card.isWinner
                ? "z-10 scale-[1.02] border-emerald-400/40 bg-zinc-900 ring-2 ring-emerald-500/50 shadow-2xl shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                : "border-white/5 bg-zinc-900/40"
            }`}
          >
            <div className="relative">
              {card.isWinner && (
                <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-emerald-300/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Industry Leader
                </span>
              )}
              <Image
                src={card.image}
                alt={card.title}
                width={900}
                height={675}
                className="aspect-[4/3] w-full rounded-t-2xl object-cover"
              />
            </div>

            <div className="p-5">
              <h3 className="mb-4 text-lg font-bold text-white">{card.title}</h3>
              <ul className="space-y-3">
                {card.items.map((item) => (
                  <li key={item.label} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <FeatureIcon state={item.state} />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
