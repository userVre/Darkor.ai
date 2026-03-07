"use client";

import { motion } from "framer-motion";
import type { SyntheticEvent } from "react";

const reveal = {
  initial: { opacity: 0, y: 40, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

function withFallback(event: SyntheticEvent<HTMLImageElement>, fallback: string) {
  const target = event.currentTarget;
  if (target.src.endsWith(fallback)) {
    return;
  }
  target.src = fallback;
}

export default function VirtualStaging() {
  return (
    <motion.section id="virtual-staging" {...reveal} className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="rounded-3xl border border-white/10 bg-zinc-900/45 p-8 md:p-12">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-5xl">Virtual Staging AI for Darkor.ai listings</h2>
          <p className="mx-auto mt-6 max-w-4xl text-center text-base leading-relaxed text-zinc-400 md:text-lg">
            Turn empty spaces into fully staged interiors in seconds while keeping dimensions and architecture faithful to the original room.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <img
            src="/media/empty-room.png"
            alt="Empty room before virtual staging"
            onError={(event) => withFallback(event, "/media/before-empty-room.png")}
            className="h-[250px] w-full rounded-2xl border border-white/5 object-cover md:h-[320px]"
          />

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center justify-center"
          >
            <svg aria-hidden="true" viewBox="0 0 170 90" className="h-16 w-24 text-white md:h-20 md:w-32" fill="none">
              <path d="M6 45c26 0 34 22 62 22 20 0 34-11 50-24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="M97 23l26 17-30 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>

          <img
            src="/media/staged-room.png"
            alt="Staged room after virtual staging"
            onError={(event) => withFallback(event, "/media/after-luxury-minimalist.png")}
            className="h-[250px] w-full rounded-2xl border border-white/5 object-cover shadow-2xl shadow-purple-500/20 md:h-[320px]"
          />
        </div>
      </div>
    </motion.section>
  );
}
