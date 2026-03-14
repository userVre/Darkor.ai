"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

import { BillingCycle, PricingTierName, useSubscriptionCheckout } from "@/app/hooks/useSubscriptionCheckout";

type PillTone = "green" | "red" | "yellow";

type FeatureRow = {
  text: string;
  pill?: PillTone;
  note?: boolean;
};

type PricingTier = {
  name: PricingTierName;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyBadge?: string;
  corePrefix: string;
  coreBadge?: string;
  features: FeatureRow[];
  isPopular?: boolean;
};

const tiers: PricingTier[] = [
  {
    name: "Pro",
    monthlyPrice: 9,
    yearlyPrice: 90,
    yearlyBadge: "Save 17%",
    corePrefix: "Create 1,000 interior designs, Flux model.",
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
    monthlyPrice: 29,
    yearlyPrice: 290,
    corePrefix: "Create 5,000 interior designs,",
    coreBadge: "Hyper Realism",
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
    monthlyPrice: 79,
    yearlyPrice: 790,
    corePrefix: "Create 25,000 interior designs,",
    coreBadge: "Hyper Realism",
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

const yearlyEffectiveRate: Record<PricingTierName, string> = {
  Pro: "7.50",
  Premium: "24.16",
  Ultra: "65.83",
};

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

export default function PricingSection() {
  const [billing, setBilling] = useState<BillingCycle>("yearly");
  const { checkoutLoadingTier, pendingIntent, error, authGateMessage, startSubscription } =
    useSubscriptionCheckout();

  const handleSubscription = async (planName: PricingTierName, cycle: BillingCycle) => {
      try {
        await startSubscription(planName, cycle);
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Unknown subscription error";
        alert(`Subscription failed: ${message}`);
      }
    };

  return (
    <section id="pricing" className="mx-auto mt-24 w-full max-w-7xl px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.15 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 text-center"
      >
        <h2 className="text-4xl font-bold text-white md:text-5xl">Plans and pricing</h2>
        <div className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-zinc-900/70 p-1 backdrop-blur-md">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setBilling("monthly")}
            className={`cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition ${
              billing === "monthly" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Monthly
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setBilling("yearly")}
            className={`cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition ${
              billing === "yearly"
                ? "bg-gradient-to-r from-emerald-500/35 to-cyan-500/35 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.18)]"
                : "text-zinc-300 hover:text-zinc-100"
            }`}
          >
            Yearly
          </motion.button>
        </div>
      </motion.div>

      {authGateMessage && <p className="mb-3 text-center text-sm text-cyan-200">{authGateMessage}</p>}
      {pendingIntent && (
        <p className="mb-3 text-center text-xs text-zinc-400">
          Pending subscription: {pendingIntent.planName} ({pendingIntent.billing})
        </p>
      )}
      {error && <p className="mb-6 text-center text-sm text-rose-300">{error}</p>}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
        className="grid gap-6 lg:grid-cols-3"
      >
        {tiers.map((tier) => {
          const isYearly = billing === "yearly";
          const mainPrice = isYearly ? yearlyEffectiveRate[tier.name] : String(tier.monthlyPrice);

          return (
            <motion.article
              key={tier.name}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              className={`relative cursor-pointer rounded-3xl border p-6 transition duration-300 ${
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

              <div className="mt-4 min-h-[94px]">
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
                      ${mainPrice}
                      <span className="text-base font-medium text-zinc-400"> / mo</span>
                    </p>
                    {isYearly ? (
                      <p className="mt-1 text-xs text-zinc-500">Billed annually at ${tier.yearlyPrice}</p>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">Billed monthly at ${tier.monthlyPrice}</p>
                    )}
                    {isYearly && tier.yearlyBadge ? (
                      <span className="mt-2 inline-flex rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                        {tier.yearlyBadge}
                      </span>
                    ) : null}
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
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${pillClasses(feature.pill)}`}
                      >
                        {feature.text}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-300">{feature.text}</span>
                    )}
                  </li>
                ))}
              </ul>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => void handleSubscription(tier.name, billing)}
                disabled={checkoutLoadingTier === tier.name}
                className={`mt-7 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition disabled:opacity-70 ${
                  tier.isPopular
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110"
                    : "border border-white/20 bg-white/5 text-zinc-100 hover:border-cyan-300/50 hover:bg-white/10"
                }`}
              >
                {checkoutLoadingTier === tier.name ? "Opening checkout..." : "Subscribe"} <ArrowRight className="h-4 w-4" />
              </motion.button>
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}
