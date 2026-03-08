"use client";

import { motion } from "framer-motion";
import { SyntheticEvent, useState } from "react";

const reveal = {
  initial: { opacity: 0, y: 46, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.2 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

const spring = { type: "spring", stiffness: 220, damping: 20 } as const;

function withFallback(primary: string, fallback: string) {
  return (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied === "true") {
      return;
    }
    img.dataset.fallbackApplied = "true";
    img.src = fallback;
  };
}

export default function TransformationSection() {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.section id="transformation" className="mx-auto w-full max-w-7xl px-6 py-24" {...reveal}>
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-black text-white md:text-5xl">Transform any room in seconds with Darkor.ai</h2>
        <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
          Upload one photo, keep your construction intact, and get premium redesign options instantly.
        </p>
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
        <img
          src="/media/empty-room.jpg"
          onError={withFallback("/media/empty-room.jpg", "/media/before-empty-room.png")}
          alt="Empty room before redesign"
          className="h-[270px] w-full rounded-2xl border border-white/5 object-cover shadow-2xl shadow-black/35 md:h-[340px]"
        />

        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto"
        >
          <svg aria-hidden="true" viewBox="0 0 220 110" className="h-16 w-24 text-white md:h-20 md:w-32" fill="none">
            <path d="M10 58c35 0 47 30 86 30 27 0 45-16 69-38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M138 20l38 25-43 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>

        <div
          className="relative h-[360px] w-full cursor-pointer"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <motion.img
            src="/media/after-luxury.jpg"
            onError={withFallback("/media/after-luxury.jpg", "/media/after-luxury-minimalist.png")}
            alt="Luxury redesign"
            animate={hovered ? { rotate: 15, x: 40, y: 20 } : { rotate: 12, x: 16, y: 0 }}
            transition={spring}
            className="absolute left-0 top-10 z-10 h-[250px] w-[84%] rounded-2xl border border-white/5 object-cover shadow-2xl md:h-[320px]"
          />

          <motion.img
            src="/media/after-cyberpunk.jpg"
            onError={withFallback("/media/after-cyberpunk.jpg", "/media/after-cyberpunk.png")}
            alt="Cyberpunk redesign"
            animate={hovered ? { rotate: 0, x: 0, y: 0 } : { rotate: 2, x: 0, y: 0 }}
            transition={spring}
            className="absolute left-4 top-6 z-20 h-[250px] w-[84%] rounded-2xl border border-white/5 object-cover shadow-2xl md:h-[320px]"
          />

          <motion.img
            src="/media/after-boho.jpg"
            onError={withFallback("/media/after-boho.jpg", "/media/after-boho-chic.png")}
            alt="Boho redesign"
            animate={hovered ? { rotate: -15, x: -40, y: -20 } : { rotate: -6, x: -16, y: 0 }}
            transition={spring}
            className="absolute left-8 top-2 z-30 h-[250px] w-[84%] rounded-2xl border border-white/5 object-cover shadow-2xl md:h-[320px]"
          />
        </div>
      </div>
    </motion.section>
  );
}
