"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

type BillingCycle = "monthly" | "yearly";
type PillTone = "green" | "red" | "yellow";

export type PricingTierName = "Pro" | "Premium" | "Ultra";

type FeatureRow = {
  text: string;
  pill?: PillTone;
  note?: boolean;
};

type PricingTier = {
  name: PricingTierName;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyCaption: string;
  corePrefix: string;
  coreBadge?: string;
  features: FeatureRow[];
  isPopular?: boolean;
};

const tiers: PricingTier[] = [
  {
    name: "Pro",
    monthlyPrice: 49,
    yearlyPrice: 29,
    yearlyCaption: "billed yearly $349, 6+ months free",
    corePrefix: "Create 1,000 interior designs, Flux™ model.",
    features: [
      { text: "Low quality renders", pill: "red" },
      { text: "Realistic interiors" },
      { text: "Generate up to 4 rooms in parallel" },
      { text: "Upload your own room interior", pill: "green" },
      { text: "Write your own design prompts" },
      { text: "Remix any interior style" },
      { text: "Commercial use license" },
    ],
  },
  {
    name: "Premium",
    monthlyPrice: 99,
    yearlyPrice: 49,
    yearlyCaption: "billed yearly $599, 6+ months free",
    corePrefix: "Create 5,000 interior designs,",
    coreBadge: "Hyper Realism™",
    isPopular: true,
    features: [
      { text: "All Pro features, plus:", note: true },
      { text: "Medium quality renders", pill: "yellow" },
      { text: "High realism and lighting" },
      { text: "Generate up to 8 rooms in parallel" },
      { text: "Edit designs", pill: "green" },
      { text: "Virtual staging", pill: "green" },
      { text: "Upscale interiors", pill: "green" },
      { text: "Paint walls", pill: "green" },
      { text: "Change lighting", pill: "green" },
      { text: "Add people", pill: "green" },
      { text: "Google Lens", pill: "green" },
      { text: "Generate walkthrough videos", pill: "green" },
      { text: "Add furniture", pill: "green" },
      { text: "Walk through in VR", pill: "green" },
    ],
  },
  {
    name: "Ultra",
    monthlyPrice: 199,
    yearlyPrice: 99,
    yearlyCaption: "billed yearly $1199, 6+ months free",
    corePrefix: "Create 25,000 interior designs,",
    coreBadge: "Hyper Realism™",
    features: [
      { text: "All Premium features, plus:", note: true },
      { text: "Ultra quality renders", pill: "green" },
      { text: "Photorealistic interiors" },
      { text: "Generate up to 16 rooms in parallel" },
      { text: "Unlimited render storage" },
      { text: "Priority rendering speed" },
      { text: "Dedicated rendering server", pill: "green" },
    ],
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const priceVariants = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
};

function pillClasses(tone: PillTone): string {
  if (tone === "green") {
    return "border-emerald-400/50 bg-emerald-400/10 text-emerald-200";
  }

  if (tone === "yellow") {
    return "border-amber-400/50 bg-amber-400/10 text-amber-200";
  }

  return "border-rose-400/50 bg-rose-400/10 text-rose-200";
}

type PricingSectionProps = {
  onSubscribe: (tier: PricingTierName) => void;
};

export default function PricingSection({ onSubscribe }: PricingSectionProps) {
  const [billing, setBilling] = useState<BillingCycle>("yearly");

  return (
    <section id="pricing" className="mx-auto mt-24 w-full max-w-7xl px-6">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-bold text-white md:text-5xl">Plans & pricing</h2>
        <div className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-zinc-900/70 p-1 backdrop-blur-md">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              billing === "monthly" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              billing === "yearly"
                ? "bg-gradient-to-r from-emerald-500/35 to-cyan-500/35 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.18)]"
                : "text-zinc-300 hover:text-zinc-100"
            }`}
          >
            Yearly: get 6+ months free
          </button>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
        className="grid gap-6 lg:grid-cols-3"
      >
        {tiers.map((tier) => {
          const price = billing === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;

          return (
            <motion.article
              key={tier.name}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              className={`relative rounded-3xl border p-6 transition duration-300 ${
                tier.isPopular
                  ? "z-10 scale-[1.02] border-cyan-300/30 bg-zinc-900 shadow-2xl shadow-[0_0_50px_rgba(56,189,248,0.16)]"
                  : "border-white/10 bg-zinc-900/60 backdrop-blur-md"
              }`}
            >
              {tier.isPopular && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Most popular
                </span>
              )}

              <h3 className="text-2xl font-bold text-white">{tier.name}</h3>

              <div className="mt-4 min-h-[78px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${tier.name}-${billing}`}
                    variants={priceVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <p className="text-4xl font-black text-white">
                      ${price}
                      <span className="text-base font-medium text-zinc-400"> / month</span>
                    </p>
                    {billing === "yearly" && (
                      <p className="mt-1 text-xs text-zinc-500">{tier.yearlyCaption}</p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <p className="mt-4 text-sm text-zinc-300">
                {tier.corePrefix}{" "}
                {tier.coreBadge && (
                  <span className="inline-flex rounded-full border border-cyan-300/45 bg-cyan-400/10 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                    {tier.coreBadge}
                  </span>
                )}
              </p>

              <ul className="mt-6 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={`${tier.name}-${feature.text}`}>
                    {feature.note ? (
                      <span className="text-sm font-medium text-zinc-400">-- {feature.text}</span>
                    ) : feature.pill ? (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${pillClasses(
                          feature.pill,
                        )}`}
                      >
                        {feature.text}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-300">{feature.text}</span>
                    )}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onSubscribe(tier.name)}
                className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition ${
                  tier.isPopular
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110"
                    : "border border-white/20 bg-white/5 text-zinc-100 hover:border-cyan-300/50 hover:bg-white/10"
                }`}
              >
                Subscribe <ArrowRight className="h-4 w-4" />
              </button>
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}
