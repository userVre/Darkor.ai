"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import beforeEmptyRoom from "@/public/media/before-empty-room.png";
import afterBohoChic from "@/public/media/after-boho-chic.png";
import afterCyberpunk from "@/public/media/after-cyberpunk.png";
import afterLuxuryMinimalist from "@/public/media/after-luxury-minimalist.png";

const reveal = {
  initial: { opacity: 0, y: 46, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.2 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

const topCard = {
  rest: { x: 0, y: 0, rotate: -6 },
  hover: { x: 20, y: -20, rotate: -15 },
};

const middleCard = {
  rest: { x: 0, y: 0, rotate: 2 },
  hover: { x: 40, y: 0, rotate: 0 },
};

const bottomCard = {
  rest: { x: 0, y: 0, rotate: 12 },
  hover: { x: 60, y: 20, rotate: 15 },
};

const cardTransition = { type: "spring", stiffness: 220, damping: 22 } as const;

export default function TransformationSection() {
  return (
    <motion.section id="transformation" className="mx-auto w-full max-w-7xl px-6 py-24" {...reveal}>
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-black text-white md:text-5xl">Transform any room in seconds with Darkor.ai</h2>
        <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
          Upload one photo, keep your construction intact, and get premium redesign options instantly.
        </p>
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
        <Image
          src={beforeEmptyRoom}
          alt="Before room"
          placeholder="blur"
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

        <motion.div initial="rest" whileHover="hover" className="relative h-[360px] w-full cursor-pointer">
          <motion.div
            variants={bottomCard}
            transition={cardTransition}
            className="absolute left-12 top-10 z-10 w-[84%]"
          >
            <Image
              src={afterLuxuryMinimalist}
              alt="Ultra-Luxury Penthouse redesign"
              placeholder="blur"
              className="h-[250px] w-full rounded-2xl border-4 border-white object-cover shadow-[0_28px_48px_rgba(0,0,0,0.55)] md:h-[320px]"
            />
          </motion.div>

          <motion.div
            variants={middleCard}
            transition={cardTransition}
            className="absolute left-6 top-6 z-20 w-[84%]"
          >
            <Image
              src={afterCyberpunk}
              alt="Cyberpunk redesign"
              placeholder="blur"
              className="h-[250px] w-full rounded-2xl border-4 border-white object-cover shadow-[0_28px_48px_rgba(0,0,0,0.55)] md:h-[320px]"
            />
          </motion.div>

          <motion.div
            variants={topCard}
            transition={cardTransition}
            className="absolute left-0 top-2 z-30 w-[84%]"
          >
            <Image
              src={afterBohoChic}
              alt="Boho Chic redesign"
              placeholder="blur"
              className="h-[250px] w-full rounded-2xl border-4 border-white object-cover shadow-[0_28px_48px_rgba(0,0,0,0.55)] md:h-[320px]"
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
