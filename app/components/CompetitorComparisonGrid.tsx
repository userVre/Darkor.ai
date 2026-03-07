"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles, XCircle } from "lucide-react";

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
    title: "Input Image",
    image: "/media/before-empty-room.png",
    items: [
      { label: "Original room geometry", state: "good" },
      { label: "No staging or redesign", state: "bad" },
      { label: "Raw lighting conditions", state: "bad" },
    ],
  },
  {
    title: "Darkor.ai",
    image: "/media/after-luxury-minimalist.png",
    isWinner: true,
    items: [
      { label: "Preserves architecture", state: "good" },
      { label: "High photorealism", state: "good" },
      { label: "Commercial-grade quality", state: "good" },
    ],
  },
  {
    title: "Competitor A",
    image: "/media/after-boho-chic.png",
    items: [
      { label: "Geometry drift", state: "bad" },
      { label: "Inconsistent object placement", state: "bad" },
      { label: "Partial realism", state: "bad" },
    ],
  },
  {
    title: "Competitor B",
    image: "/media/after-cyberpunk.png",
    items: [
      { label: "Over-stylized output", state: "bad" },
      { label: "Low brand usability", state: "bad" },
      { label: "Unstable results", state: "bad" },
    ],
  },
  {
    title: "Competitor C",
    image: "/media/sketch-before.png",
    items: [
      { label: "Weak detail rendering", state: "bad" },
      { label: "Poor material consistency", state: "bad" },
      { label: "Low conversion quality", state: "bad" },
    ],
  },
  {
    title: "Competitor D",
    image: "/media/garden-empty.png",
    items: [
      { label: "Limited context understanding", state: "bad" },
      { label: "Uneven depth and shadows", state: "bad" },
      { label: "Needs heavy manual fixes", state: "bad" },
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
  if (state === "good") {
    return <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />;
  }
  return <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />;
}

export default function CompetitorComparisonGrid() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold text-white md:text-5xl">How Darkor.ai compares</h2>
        <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
          Compare results side by side. Darkor.ai consistently delivers cleaner architecture preservation and higher-quality output.
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
            className={`overflow-hidden rounded-2xl border ${
              card.isWinner
                ? "z-10 scale-[1.02] border-emerald-400/60 bg-zinc-900 ring-2 ring-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.25)]"
                : "border-white/10 bg-zinc-900/50"
            }`}
          >
            <div className="relative">
              {card.isWinner ? (
                <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-emerald-300/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Industry Leader
                </span>
              ) : null}
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

      <div className="mt-8 text-center">
        <Link
          href="#auth-flow"
          className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] transition hover:brightness-110"
        >
          Redesign yours now
        </Link>
      </div>
    </section>
  );
}
