"use client";

import { motion } from "framer-motion";

const reveal = {
  initial: { opacity: 0, y: 46, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.2 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

export default function FeaturesSection() {
  return (
    <section id="features" className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 py-24">
      <motion.article {...reveal} className="rounded-3xl border border-white/10 bg-zinc-900/40 p-8 md:p-12">
        <div className="mb-8 text-center">
          <h3 className="text-3xl font-bold text-white md:text-4xl">Sketch2Image: from concept to premium render</h3>
          <p className="mx-auto mt-3 max-w-3xl text-zinc-400">
            Darkor.ai converts rough sketches into polished interior visuals suitable for real client presentations.
          </p>
        </div>

        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <img
            src="/media/sketch.jpg"
            alt="Sketch before"
            className="h-[240px] w-full rounded-2xl border border-white/5 object-cover md:h-[310px]"
          />
          <svg aria-hidden="true" viewBox="0 0 170 90" className="mx-auto h-16 w-24 text-white md:h-20 md:w-32" fill="none">
            <path d="M6 45c26 0 34 22 62 22 20 0 34-11 50-24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M97 23l26 17-30 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <img
            src="/media/render.jpg"
            alt="Render after"
            className="h-[240px] w-full rounded-2xl border border-white/5 object-cover md:h-[310px]"
          />
        </div>
      </motion.article>

      <motion.article {...reveal} className="rounded-3xl border border-white/10 bg-zinc-900/40 p-8 md:p-12">
        <div className="mb-8 text-center">
          <h3 className="text-3xl font-bold text-white md:text-4xl">Design gardens and outdoor spaces</h3>
          <p className="mx-auto mt-3 max-w-3xl text-zinc-400">
            Darkor.ai upgrades empty yards into cohesive outdoor environments with landscaping, lighting, and spatial harmony.
          </p>
        </div>

        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <img
            src="/media/garden-before.jpg"
            alt="Outdoor before redesign"
            className="h-[240px] w-full rounded-2xl border border-white/5 object-cover md:h-[310px]"
          />
          <svg aria-hidden="true" viewBox="0 0 170 90" className="mx-auto h-16 w-24 text-white md:h-20 md:w-32" fill="none">
            <path d="M6 45c26 0 34 22 62 22 20 0 34-11 50-24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M97 23l26 17-30 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <img
            src="/media/garden-after.jpg"
            alt="Outdoor after redesign"
            className="h-[240px] w-full rounded-2xl border border-white/5 object-cover md:h-[310px]"
          />
        </div>
      </motion.article>
    </section>
  );
}
