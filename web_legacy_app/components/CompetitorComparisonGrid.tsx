"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Sparkles, XCircle } from "lucide-react";
import { SyntheticEvent } from "react";

type ItemState = "good" | "bad" | "neutral";

type ComparisonItem = {
  label: string;
  state: ItemState;
};

type ComparisonCard = {
  title: string;
  image: string;
  fallbackImage: string;
  items: ComparisonItem[];
  isWinner?: boolean;
};

const cards: ComparisonCard[] = [
  {
    title: "Challenging Raw Input",
    image: "/media/comp-1.jpg",
    fallbackImage: "/media/empty-room.jpg",
    items: [
      { label: "Complex lighting", state: "neutral" },
      { label: "Wide-angle perspective", state: "neutral" },
      { label: "Bare concrete textures", state: "neutral" },
    ],
  },
  {
    title: "Darkor.ai (Premium)",
    image: "/media/comp-2.jpg",
    fallbackImage: "/media/after-luxury.jpg",
    isWinner: true,
    items: [
      { label: "Perfect Architectural Integrity", state: "good" },
      { label: "8K Ultra-Photorealistic", state: "good" },
      { label: "Masterful Material Physics", state: "good" },
      { label: "Cinematic Natural Lighting", state: "good" },
    ],
  },
  {
    title: "Structural Failure",
    image: "/media/comp-3.jpg",
    fallbackImage: "/media/after-boho.jpg",
    items: [
      { label: "Alters Walls & Windows", state: "bad" },
      { label: "Sharp Quality", state: "good" },
      { label: "Lost Room Context", state: "bad" },
    ],
  },
  {
    title: "Low-Tier Preview",
    image: "/media/comp-4.jpg",
    fallbackImage: "/media/after-cyberpunk.jpg",
    items: [
      { label: "Compressed Textures", state: "bad" },
      { label: "Blurry/Soft Details", state: "bad" },
      { label: "Correct Layout", state: "good" },
    ],
  },
  {
    title: "Artificial 3D Model",
    image: "/media/comp-5.jpg",
    fallbackImage: "/media/render.jpg",
    items: [
      { label: "Plastic Material Look", state: "bad" },
      { label: "Unrealistic Shadows", state: "bad" },
      { label: "No Real-World Depth", state: "bad" },
    ],
  },
  {
    title: "AI Hallucinations",
    image: "/media/comp-6.jpg",
    fallbackImage: "/media/staging-after.jpg",
    items: [
      { label: "Distorted Furniture", state: "bad" },
      { label: "Impossible Physics", state: "bad" },
      { label: "High Sharpness", state: "good" },
    ],
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function FeatureIcon({ state }: { state: ItemState }) {
  if (state === "neutral") {
    return <Circle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />;
  }

  return state === "good" ? (
    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
  ) : (
    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
  );
}

function setFallback(event: SyntheticEvent<HTMLImageElement>, target: string) {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied === "true") {
    return;
  }
  img.dataset.fallbackApplied = "true";
  img.src = target;
}

export default function CompetitorComparisonGrid() {
  return (
    <motion.section
      className="mx-auto w-full max-w-7xl cursor-pointer px-6 py-24"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold text-white md:text-5xl">Why premium teams choose Darkor.ai for high-value interiors</h2>
        <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
          One input. Six outputs. Darkor.ai is the only system that preserves architectural truth while delivering cinematic luxury realism.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((card) => (
          <motion.article
            key={card.title}
            variants={cardVariants}
            className={`flex h-full min-h-[520px] cursor-pointer flex-col overflow-hidden rounded-2xl border ${
              card.isWinner
                ? "z-10 scale-[1.02] border-emerald-400/60 bg-zinc-900 ring-2 ring-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.25)]"
                : "border-white/5 bg-zinc-900/50"
            }`}
          >
            <div className="relative p-3 pb-0">
              {card.isWinner ? (
                <span className="absolute right-5 top-5 z-10 inline-flex items-center gap-1 rounded-full border border-emerald-300/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Industry Leader
                </span>
              ) : null}
              <img
                src={card.image}
                onError={(event) => setFallback(event, card.fallbackImage)}
                alt={card.title}
                className="h-56 w-full rounded-2xl border border-white/5 object-cover"
              />
            </div>

            <div className="flex flex-1 flex-col p-5">
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
    </motion.section>
  );
}
