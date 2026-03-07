"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";

type ItemState = "good" | "bad";

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
    title: "Input",
    image: "/media/bedroom-input.png",
    items: [
      { label: "Maintains original construction", state: "good" },
      { label: "No staged furnishing", state: "bad" },
      { label: "No premium visual polish", state: "bad" },
    ],
  },
  {
    title: "Darkor.ai",
    image: "/media/bedroom-darkor-japandi.png",
    isWinner: true,
    items: [
      { label: "Maintains construction", state: "good" },
      { label: "High photorealism", state: "good" },
      { label: "Premium material quality", state: "good" },
    ],
  },
  {
    title: "Decorify",
    image: "/media/bedroom-decorify-window-shift.png",
    items: [
      { label: "Maintains construction", state: "bad" },
      { label: "High photorealism", state: "bad" },
      { label: "Architectural consistency", state: "bad" },
    ],
  },
  {
    title: "AI Room Planner",
    image: "/media/bedroom-airoomplanner-blurry.png",
    items: [
      { label: "Maintains construction", state: "good" },
      { label: "Sharp output", state: "bad" },
      { label: "Fine texture detail", state: "bad" },
    ],
  },
  {
    title: "RoomGPT",
    image: "/media/bedroom-roomgpt-flat.png",
    items: [
      { label: "Maintains construction", state: "good" },
      { label: "Natural materials", state: "bad" },
      { label: "Premium realism", state: "bad" },
    ],
  },
  {
    title: "Dreamstudio",
    image: "/media/bedroom-dreamstudio-melted.png",
    items: [
      { label: "Maintains construction", state: "bad" },
      { label: "Object integrity", state: "bad" },
      { label: "Production-ready quality", state: "bad" },
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
  return state === "good" ? (
    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
  ) : (
    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
  );
}

export default function CompetitorComparisonGrid() {
  return (
    <motion.section
      className="mx-auto w-full max-w-7xl px-6 py-24"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold text-white md:text-5xl">How Darkor.ai compares for bedroom redesigns</h2>
        <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
          Side-by-side bedroom outputs show why Darkor.ai leads in construction preservation, realism, and production-ready quality.
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
            className={`flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border ${
              card.isWinner
                ? "z-10 scale-[1.02] border-emerald-400/60 bg-zinc-900 ring-2 ring-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.25)]"
                : "border-white/5 bg-zinc-900/50"
            }`}
          >
            <div className="relative">
              {card.isWinner ? (
                <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-emerald-300/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Industry Leader
                </span>
              ) : null}
              <img src={card.image} alt={card.title} className="h-56 w-full rounded-t-2xl border-b border-white/5 object-cover" />
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
