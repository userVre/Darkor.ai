"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";

import beforeEmptyRoom from "@/public/media/before-empty-room.png";
import afterLuxuryMinimalist from "@/public/media/after-luxury-minimalist.png";
import afterBohoChic from "@/public/media/after-boho-chic.png";
import afterCyberpunk from "@/public/media/after-cyberpunk.png";

const reveal = {
  initial: { opacity: 0, y: 46, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.2 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

const stack = [
  { src: afterLuxuryMinimalist, alt: "Darkor.ai luxury redesign", offset: "-rotate-6 translate-x-[-18px] translate-y-5", hover: "group-hover:-rotate-[18deg] group-hover:translate-x-[-66px] group-hover:translate-y-9" },
  { src: afterBohoChic, alt: "Darkor.ai boho redesign", offset: "rotate-0", hover: "group-hover:rotate-0 group-hover:translate-y-[-6px]" },
  { src: afterCyberpunk, alt: "Darkor.ai cyber redesign", offset: "rotate-6 translate-x-[18px] translate-y-5", hover: "group-hover:rotate-[18deg] group-hover:translate-x-[66px] group-hover:translate-y-9" },
];

export default function TransformationSection() {
  const [isHovered, setIsHovered] = useState(false);

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

        <div
          className="group relative h-[340px]"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {stack.map((image, index) => (
            <motion.div
              key={image.alt}
              initial={false}
              animate={{
                rotate: isHovered ? (index - 1) * 18 : (index - 1) * 6,
                x: isHovered ? (index - 1) * 72 : (index - 1) * 16,
                y: isHovered ? (index === 1 ? -8 : 24) : index === 1 ? 0 : 18,
              }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 mx-auto w-full max-w-[560px]"
            >
              <Image
                src={image.src}
                alt={image.alt}
                placeholder="blur"
                className="h-[270px] w-full rounded-2xl border border-white/5 object-cover shadow-2xl shadow-black/40 md:h-[340px]"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
